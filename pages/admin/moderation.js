import React from "react";
import Layout from "../../components/Layout";
import ModerationDashboard from "../../components/moderation/ModerationDashboard";

const ModerationPage = () => {
  return (
    <Layout title="AI Moderation Dashboard - Next Social">
      <ModerationDashboard />
    </Layout>
  );
};

export default ModerationPage;
