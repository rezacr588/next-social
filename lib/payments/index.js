// lib/payments/index.js - Advanced Payment Integration System
const crypto = require('crypto');
const { logger } = require('../logger.js');
const { databaseManager } = require('../database/index.js');
const { ValidationError, NotFoundError } = require('../errors.js');
const { memoize, retry, measurePerformance } = require('../utils/index.js');

class PaymentService {
  constructor() {
    this.providers = new Map();
    this.subscriptions = new Map();
    this.paymentMethods = new Map();
    this.transactions = new Map();
    this.webhooks = new Map();

    this.initializeProviders();
    this.loadSubscriptionPlans();
    this.setupWebhookHandlers();
  }

  initializeProviders() {
    // Stripe integration
    if (process.env.STRIPE_SECRET_KEY) {
      this.providers.set('stripe', {
        name: 'Stripe',
        enabled: true,
        secretKey: process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        supportedCurrencies: ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud'],
        features: ['subscriptions', 'one-time', 'refunds', 'invoices']
      });
    }

    // PayPal integration
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.providers.set('paypal', {
        name: 'PayPal',
        enabled: true,
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
        supportedCurrencies: ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'chf'],
        features: ['subscriptions', 'one-time', 'refunds', 'payouts']
      });
    }

    // Square integration
    if (process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID) {
      this.providers.set('square', {
        name: 'Square',
        enabled: true,
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        applicationId: process.env.SQUARE_APPLICATION_ID,
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
        supportedCurrencies: ['usd', 'cad'],
        features: ['subscriptions', 'one-time', 'refunds', 'cards']
      });
    }

    // Mock provider for testing
    this.providers.set('mock', {
      name: 'Mock Payment',
      enabled: true,
      supportedCurrencies: ['usd', 'eur', 'gbp'],
      features: ['subscriptions', 'one-time', 'refunds']
    });

    logger.info('Payment providers initialized', {
      providers: Array.from(this.providers.keys())
    });
  }

  loadSubscriptionPlans() {
    // Define subscription plans
    this.subscriptionPlans = {
      basic: {
        id: 'plan_basic',
        name: 'Basic Plan',
        description: 'Perfect for individuals',
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        features: ['basic_features', 'email_support', '5gb_storage'],
        limits: {
          posts: 100,
          storage: 5 * 1024 * 1024 * 1024, // 5GB
          apiCalls: 1000
        }
      },
      pro: {
        id: 'plan_pro',
        name: 'Professional Plan',
        description: 'For growing teams and businesses',
        price: 29.99,
        currency: 'usd',
        interval: 'month',
        features: ['advanced_features', 'priority_support', 'unlimited_storage', 'analytics'],
        limits: {
          posts: 1000,
          storage: 100 * 1024 * 1024 * 1024, // 100GB
          apiCalls: 10000
        }
      },
      enterprise: {
        id: 'plan_enterprise',
        name: 'Enterprise Plan',
        description: 'For large organizations',
        price: 99.99,
        currency: 'usd',
        interval: 'month',
        features: ['enterprise_features', 'dedicated_support', 'custom_integrations', 'sla'],
        limits: {
          posts: -1, // unlimited
          storage: -1, // unlimited
          apiCalls: -1 // unlimited
        }
      }
    };

    logger.info('Subscription plans loaded', { plans: Object.keys(this.subscriptionPlans) });
  }

  setupWebhookHandlers() {
    // Webhook event handlers for different providers
    this.webhookHandlers = {
      stripe: this.handleStripeWebhook.bind(this),
      paypal: this.handlePayPalWebhook.bind(this),
      square: this.handleSquareWebhook.bind(this),
      mock: this.handleMockWebhook.bind(this)
    };

    logger.info('Webhook handlers initialized');
  }

  // Subscription Management
  async createSubscription(userId, planId, paymentMethodId, options = {}) {
    return await measurePerformance('PaymentService.createSubscription', async () => {
      try {
        const plan = this.subscriptionPlans[planId];
        if (!plan) {
          throw new ValidationError('Invalid subscription plan');
        }

        // Validate user's payment method
        const paymentMethod = await this.getPaymentMethod(userId, paymentMethodId);
        if (!paymentMethod) {
          throw new ValidationError('Invalid payment method');
        }

        // Calculate proration if upgrading/downgrading
        const prorationAmount = await this.calculateProration(userId, planId);

        const subscription = {
          id: this.generateSubscriptionId(),
          userId,
          planId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculatePeriodEnd(plan.interval),
          cancelAtPeriodEnd: false,
          prorationAmount,
          metadata: options.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Process initial payment
        const payment = await this.processSubscriptionPayment(subscription, paymentMethod);

        // Save subscription to database
        await this.saveSubscriptionToDatabase(subscription);

        // Update user's subscription status
        await this.updateUserSubscription(userId, subscription);

        // Send confirmation
        await this.sendSubscriptionConfirmation(userId, subscription);

        logger.info('Subscription created successfully', {
          subscriptionId: subscription.id,
          userId,
          planId
        });

        return {
          subscription,
          payment,
          clientSecret: payment.clientSecret
        };
      } catch (error) {
        logger.error('Subscription creation failed', { error, userId, planId });
        throw error;
      }
    });
  }

  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    return await measurePerformance('PaymentService.cancelSubscription', async () => {
      try {
        const subscription = await this.getSubscription(subscriptionId);
        if (!subscription) {
          throw new NotFoundError('Subscription');
        }

        if (cancelImmediately) {
          subscription.status = 'cancelled';
          subscription.cancelledAt = new Date();
          subscription.currentPeriodEnd = new Date();
        } else {
          subscription.status = 'active';
          subscription.cancelAtPeriodEnd = true;
        }

        subscription.updatedAt = new Date();

        // Update subscription in database
        await this.updateSubscriptionInDatabase(subscription);

        // Process any refunds if cancelling immediately
        if (cancelImmediately) {
          await this.processCancellationRefund(subscription);
        }

        // Send cancellation confirmation
        await this.sendCancellationConfirmation(subscription.userId, subscription);

        logger.info('Subscription cancelled', {
          subscriptionId,
          userId: subscription.userId,
          cancelledImmediately: cancelImmediately
        });

        return subscription;
      } catch (error) {
        logger.error('Subscription cancellation failed', { error, subscriptionId });
        throw error;
      }
    });
  }

  async updateSubscription(subscriptionId, updates) {
    return await measurePerformance('PaymentService.updateSubscription', async () => {
      try {
        const subscription = await this.getSubscription(subscriptionId);
        if (!subscription) {
          throw new NotFoundError('Subscription');
        }

        // Handle plan changes
        if (updates.planId && updates.planId !== subscription.planId) {
          await this.changeSubscriptionPlan(subscription, updates.planId);
        }

        // Handle payment method updates
        if (updates.paymentMethodId) {
          await this.updateSubscriptionPaymentMethod(subscription, updates.paymentMethodId);
        }

        Object.assign(subscription, updates);
        subscription.updatedAt = new Date();

        await this.updateSubscriptionInDatabase(subscription);

        logger.info('Subscription updated', { subscriptionId, updates });
        return subscription;
      } catch (error) {
        logger.error('Subscription update failed', { error, subscriptionId });
        throw error;
      }
    });
  }

  async changeSubscriptionPlan(subscription, newPlanId) {
    const newPlan = this.subscriptionPlans[newPlanId];
    if (!newPlan) {
      throw new ValidationError('Invalid plan');
    }

    const oldPlan = this.subscriptionPlans[subscription.planId];

    // Calculate proration
    const prorationAmount = await this.calculatePlanChangeProration(subscription, oldPlan, newPlan);

    subscription.planId = newPlanId;
    subscription.prorationAmount = prorationAmount;
    subscription.updatedAt = new Date();

    // Process prorated payment
    if (prorationAmount !== 0) {
      await this.processProratedPayment(subscription, prorationAmount);
    }

    return subscription;
  }

  // Payment Processing
  async processPayment(amount, currency, paymentMethod, description = '') {
    return await measurePerformance('PaymentService.processPayment', async () => {
      try {
        const payment = {
          id: this.generatePaymentId(),
          amount,
          currency,
          paymentMethodId: paymentMethod.id,
          description,
          status: 'pending',
          createdAt: new Date()
        };

        // Process payment based on provider
        const provider = this.providers.get(paymentMethod.provider);
        if (!provider || !provider.enabled) {
          throw new ValidationError('Payment provider not available');
        }

        const result = await this.processPaymentWithProvider(payment, provider);

        payment.status = result.success ? 'completed' : 'failed';
        payment.providerResponse = result;

        // Save payment to database
        await this.savePaymentToDatabase(payment);

        logger.info('Payment processed', {
          paymentId: payment.id,
          amount,
          currency,
          status: payment.status
        });

        return payment;
      } catch (error) {
        logger.error('Payment processing failed', { error, amount, currency });
        throw error;
      }
    });
  }

  async processPaymentWithProvider(payment, provider) {
    switch (provider.name.toLowerCase()) {
      case 'stripe':
        return await this.processStripePayment(payment, provider);
      case 'paypal':
        return await this.processPayPalPayment(payment, provider);
      case 'square':
        return await this.processSquarePayment(payment, provider);
      case 'mock':
        return await this.processMockPayment(payment, provider);
      default:
        throw new ValidationError('Unsupported payment provider');
    }
  }

  async processStripePayment(payment, provider) {
    // Mock Stripe payment processing
    return {
      success: true,
      provider: 'stripe',
      transactionId: `ch_${crypto.randomBytes(16).toString('hex')}`,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  async processPayPalPayment(payment, provider) {
    // Mock PayPal payment processing
    return {
      success: true,
      provider: 'paypal',
      transactionId: `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  async processSquarePayment(payment, provider) {
    // Mock Square payment processing
    return {
      success: true,
      provider: 'square',
      transactionId: `square_${crypto.randomBytes(8).toString('hex')}`,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  async processMockPayment(payment, provider) {
    // Mock payment processing for testing
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time

    return {
      success: Math.random() > 0.1, // 90% success rate
      provider: 'mock',
      transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  // Payment Methods Management
  async createPaymentMethod(userId, paymentMethodData) {
    return await measurePerformance('PaymentService.createPaymentMethod', async () => {
      try {
        const paymentMethod = {
          id: this.generatePaymentMethodId(),
          userId,
          type: paymentMethodData.type,
          provider: paymentMethodData.provider,
          last4: paymentMethodData.last4,
          brand: paymentMethodData.brand,
          expiryMonth: paymentMethodData.expiryMonth,
          expiryYear: paymentMethodData.expiryYear,
          isDefault: paymentMethodData.isDefault || false,
          metadata: paymentMethodData.metadata || {},
          createdAt: new Date()
        };

        // Tokenize payment method with provider
        await this.tokenizePaymentMethod(paymentMethod);

        // Save to database
        await this.savePaymentMethodToDatabase(paymentMethod);

        // Set as default if specified
        if (paymentMethod.isDefault) {
          await this.setDefaultPaymentMethod(userId, paymentMethod.id);
        }

        logger.info('Payment method created', {
          paymentMethodId: paymentMethod.id,
          userId,
          type: paymentMethod.type
        });

        return paymentMethod;
      } catch (error) {
        logger.error('Payment method creation failed', { error, userId });
        throw error;
      }
    });
  }

  async tokenizePaymentMethod(paymentMethod) {
    // Mock tokenization
    paymentMethod.token = `tok_${crypto.randomBytes(16).toString('hex')}`;
    return paymentMethod;
  }

  async setDefaultPaymentMethod(userId, paymentMethodId) {
    // Remove default flag from all other payment methods
    await this.db.executeQuery(
      'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?',
      [userId]
    );

    // Set new default
    await this.db.executeQuery(
      'UPDATE payment_methods SET is_default = 1 WHERE id = ?',
      [paymentMethodId]
    );

    logger.debug('Default payment method updated', { userId, paymentMethodId });
  }

  // Refund Processing
  async processRefund(paymentId, amount = null, reason = '') {
    return await measurePerformance('PaymentService.processRefund', async () => {
      try {
        const payment = await this.getPayment(paymentId);
        if (!payment) {
          throw new NotFoundError('Payment');
        }

        const refundAmount = amount || payment.amount;

        if (refundAmount > payment.amount) {
          throw new ValidationError('Refund amount cannot exceed payment amount');
        }

        const refund = {
          id: this.generateRefundId(),
          paymentId,
          amount: refundAmount,
          currency: payment.currency,
          reason,
          status: 'pending',
          createdAt: new Date()
        };

        // Process refund with provider
        const result = await this.processRefundWithProvider(payment, refund);

        refund.status = result.success ? 'completed' : 'failed';
        refund.providerResponse = result;

        // Save refund to database
        await this.saveRefundToDatabase(refund);

        // Update payment status if fully refunded
        if (refundAmount === payment.amount) {
          await this.updatePaymentStatus(paymentId, 'refunded');
        }

        logger.info('Refund processed', {
          refundId: refund.id,
          paymentId,
          amount: refundAmount,
          status: refund.status
        });

        return refund;
      } catch (error) {
        logger.error('Refund processing failed', { error, paymentId });
        throw error;
      }
    });
  }

  async processRefundWithProvider(payment, refund) {
    const provider = this.providers.get(payment.provider);
    if (!provider) {
      throw new ValidationError('Payment provider not found');
    }

    // Mock refund processing
    return {
      success: true,
      provider: payment.provider,
      refundId: `ref_${crypto.randomBytes(8).toString('hex')}`,
      amount: refund.amount
    };
  }

  // Webhook Handling
  async handleWebhook(provider, payload, signature) {
    return await measurePerformance('PaymentService.handleWebhook', async () => {
      try {
        const handler = this.webhookHandlers[provider];
        if (!handler) {
          throw new ValidationError('Webhook handler not found');
        }

        // Verify webhook signature
        await this.verifyWebhookSignature(provider, payload, signature);

        // Process webhook event
        const result = await handler(payload);

        logger.info('Webhook processed', { provider, eventType: payload.type });
        return result;
      } catch (error) {
        logger.error('Webhook processing failed', { error, provider });
        throw error;
      }
    });
  }

  async handleStripeWebhook(payload) {
    const event = payload;

    switch (event.type) {
      case 'payment_intent.succeeded':
        return await this.handlePaymentSuccess(event.data.object);
      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailure(event.data.object);
      case 'customer.subscription.created':
        return await this.handleSubscriptionCreated(event.data.object);
      case 'customer.subscription.updated':
        return await this.handleSubscriptionUpdated(event.data.object);
      case 'customer.subscription.deleted':
        return await this.handleSubscriptionDeleted(event.data.object);
      case 'invoice.payment_succeeded':
        return await this.handleInvoicePaymentSucceeded(event.data.object);
      default:
        logger.debug('Unhandled webhook event', { type: event.type });
        return { handled: false, eventType: event.type };
    }
  }

  async handlePayPalWebhook(payload) {
    // Mock PayPal webhook handling
    return { handled: true, provider: 'paypal' };
  }

  async handleSquareWebhook(payload) {
    // Mock Square webhook handling
    return { handled: true, provider: 'square' };
  }

  async handleMockWebhook(payload) {
    // Mock webhook handling for testing
    return { handled: true, provider: 'mock' };
  }

  // Event Handlers
  async handlePaymentSuccess(paymentIntent) {
    const payment = await this.getPaymentByProviderId(paymentIntent.id);
    if (payment) {
      await this.updatePaymentStatus(payment.id, 'completed');
      await this.sendPaymentConfirmation(payment.userId, payment);
    }
    return { handled: true };
  }

  async handlePaymentFailure(paymentIntent) {
    const payment = await this.getPaymentByProviderId(paymentIntent.id);
    if (payment) {
      await this.updatePaymentStatus(payment.id, 'failed');
      await this.sendPaymentFailureNotification(payment.userId, payment);
    }
    return { handled: true };
  }

  async handleSubscriptionCreated(subscription) {
    const localSubscription = await this.getSubscriptionByProviderId(subscription.id);
    if (localSubscription) {
      await this.updateSubscriptionStatus(localSubscription.id, 'active');
    }
    return { handled: true };
  }

  async handleSubscriptionUpdated(subscription) {
    const localSubscription = await this.getSubscriptionByProviderId(subscription.id);
    if (localSubscription) {
      await this.updateSubscriptionFromProvider(localSubscription.id, subscription);
    }
    return { handled: true };
  }

  async handleSubscriptionDeleted(subscription) {
    const localSubscription = await this.getSubscriptionByProviderId(subscription.id);
    if (localSubscription) {
      await this.updateSubscriptionStatus(localSubscription.id, 'cancelled');
    }
    return { handled: true };
  }

  async handleInvoicePaymentSucceeded(invoice) {
    // Handle successful invoice payments
    return { handled: true };
  }

  // Utility Methods
  generateSubscriptionId() {
    return `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generatePaymentId() {
    return `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generatePaymentMethodId() {
    return `pm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateRefundId() {
    return `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  calculatePeriodEnd(interval) {
    const now = new Date();
    switch (interval) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'year':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  async calculateProration(userId, newPlanId) {
    // Mock proration calculation
    const newPlan = this.subscriptionPlans[newPlanId];
    const currentSubscription = await this.getUserSubscription(userId);

    if (!currentSubscription) return 0;

    const currentPlan = this.subscriptionPlans[currentSubscription.planId];
    const prorationAmount = (newPlan.price - currentPlan.price) * 0.5; // Simplified proration

    return Math.max(0, prorationAmount);
  }

  async calculatePlanChangeProration(subscription, oldPlan, newPlan) {
    // Calculate proration for plan changes
    const remainingDays = Math.ceil((subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
    const totalDays = oldPlan.interval === 'month' ? 30 : 365;
    const dailyRate = oldPlan.price / totalDays;

    const unusedCredit = dailyRate * remainingDays;
    const newPlanDailyRate = newPlan.price / totalDays;
    const newPlanCharge = newPlanDailyRate * remainingDays;

    return newPlanCharge - unusedCredit;
  }

  // Database Operations (Mock implementations)
  async saveSubscriptionToDatabase(subscription) {
    // Mock database save
    this.subscriptions.set(subscription.id, subscription);
    logger.debug('Subscription saved to database', { subscriptionId: subscription.id });
    return subscription;
  }

  async getSubscription(subscriptionId) {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async updateSubscriptionInDatabase(subscription) {
    if (this.subscriptions.has(subscription.id)) {
      this.subscriptions.set(subscription.id, subscription);
      logger.debug('Subscription updated in database', { subscriptionId: subscription.id });
      return subscription;
    }
    throw new NotFoundError('Subscription');
  }

  async getUserSubscription(userId) {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.userId === userId && subscription.status === 'active') {
        return subscription;
      }
    }
    return null;
  }

  async savePaymentToDatabase(payment) {
    this.transactions.set(payment.id, payment);
    logger.debug('Payment saved to database', { paymentId: payment.id });
    return payment;
  }

  async getPayment(paymentId) {
    return this.transactions.get(paymentId) || null;
  }

  async updatePaymentStatus(paymentId, status) {
    const payment = this.transactions.get(paymentId);
    if (payment) {
      payment.status = status;
      payment.updatedAt = new Date();
      logger.debug('Payment status updated', { paymentId, status });
      return payment;
    }
    throw new NotFoundError('Payment');
  }

  async savePaymentMethodToDatabase(paymentMethod) {
    this.paymentMethods.set(paymentMethod.id, paymentMethod);
    logger.debug('Payment method saved to database', { paymentMethodId: paymentMethod.id });
    return paymentMethod;
  }

  async getPaymentMethod(userId, paymentMethodId) {
    const paymentMethod = this.paymentMethods.get(paymentMethodId);
    return paymentMethod && paymentMethod.userId === userId ? paymentMethod : null;
  }

  async processSubscriptionPayment(subscription, paymentMethod) {
    // Mock payment processing
    return {
      id: this.generatePaymentId(),
      subscriptionId: subscription.id,
      amount: subscription.prorationAmount || this.subscriptionPlans[subscription.planId].price,
      currency: 'usd',
      status: 'completed',
      clientSecret: `cs_test_${crypto.randomBytes(8).toString('hex')}`
    };
  }

  async processProratedPayment(subscription, amount) {
    // Mock prorated payment
    logger.debug('Prorated payment processed', { subscriptionId: subscription.id, amount });
    return true;
  }

  async processCancellationRefund(subscription) {
    // Mock cancellation refund
    logger.debug('Cancellation refund processed', { subscriptionId: subscription.id });
    return true;
  }

  async updateUserSubscription(userId, subscription) {
    // Mock user subscription update
    logger.debug('User subscription updated', { userId, subscriptionId: subscription.id });
    return true;
  }

  async sendSubscriptionConfirmation(userId, subscription) {
    // Mock confirmation email
    logger.debug('Subscription confirmation sent', { userId, subscriptionId: subscription.id });
    return true;
  }

  async sendCancellationConfirmation(userId, subscription) {
    // Mock cancellation email
    logger.debug('Cancellation confirmation sent', { userId, subscriptionId: subscription.id });
    return true;
  }

  async getPaymentByProviderId(providerPaymentId) {
    for (const [id, payment] of this.transactions.entries()) {
      if (payment.providerPaymentId === providerPaymentId) {
        return payment;
      }
    }
    return null;
  }

  async updateSubscriptionStatus(subscriptionId, status) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.status = status;
      subscription.updatedAt = new Date();
      return subscription;
    }
    throw new NotFoundError('Subscription');
  }

  async updateSubscriptionFromProvider(subscriptionId, providerData) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      Object.assign(subscription, {
        status: providerData.status,
        currentPeriodEnd: new Date(providerData.current_period_end * 1000),
        updatedAt: new Date()
      });
      return subscription;
    }
    throw new NotFoundError('Subscription');
  }

  async getSubscriptionByProviderId(providerSubscriptionId) {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.providerSubscriptionId === providerSubscriptionId) {
        return subscription;
      }
    }
    return null;
  }

  async sendPaymentConfirmation(userId, payment) {
    // Mock payment confirmation
    logger.debug('Payment confirmation sent', { userId, paymentId: payment.id });
    return true;
  }

  async sendPaymentFailureNotification(userId, payment) {
    // Mock payment failure notification
    logger.debug('Payment failure notification sent', { userId, paymentId: payment.id });
    return true;
  }

  async verifyWebhookSignature(provider, payload, signature) {
    // Mock signature verification
    return true;
  }

  async updateSubscriptionPaymentMethod(subscription, paymentMethodId) {
    // Mock payment method update
    logger.debug('Subscription payment method updated', {
      subscriptionId: subscription.id,
      paymentMethodId
    });
    return true;
  }

  async saveRefundToDatabase(refund) {
    // Mock refund save
    logger.debug('Refund saved to database', { refundId: refund.id });
    return refund;
  }

  // Public API
  getProviders() {
    return Array.from(this.providers.entries()).map(([key, config]) => ({
      name: key,
      ...config
    }));
  }

  getSubscriptionPlans() {
    return Object.values(this.subscriptionPlans);
  }

  getUserSubscriptions(userId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  getPaymentHistory(userId, limit = 50) {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  // Analytics
  async getRevenueAnalytics(timeframe = '30d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    return {
      totalRevenue: Math.floor(Math.random() * 10000),
      monthlyRecurringRevenue: Math.floor(Math.random() * 5000),
      averageRevenuePerUser: Math.floor(Math.random() * 50),
      churnRate: Math.random() * 5,
      lifetimeValue: Math.floor(Math.random() * 1000),
      revenueByPlan: Object.entries(this.subscriptionPlans).map(([key, plan]) => ({
        plan: plan.name,
        revenue: Math.floor(Math.random() * 2000),
        subscribers: Math.floor(Math.random() * 100)
      }))
    };
  }

  // Health Check
  getHealth() {
    return {
      isHealthy: this.providers.size > 0,
      providers: Array.from(this.providers.keys()),
      subscriptions: this.subscriptions.size,
      transactions: this.transactions.size,
      timestamp: new Date()
    };
  }

  // Cache management
  clearCache() {
    this.subscriptions.clear();
    this.transactions.clear();
    this.paymentMethods.clear();
    logger.info('Payment cache cleared');
  }
}

const paymentService = new PaymentService();

module.exports = {
  PaymentService,
  paymentService
};
