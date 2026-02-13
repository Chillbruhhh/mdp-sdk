import { MDPAgentSDK } from "@moltdomesticproduct/mdp-sdk";
import * as fs from "fs";
(async () => {
  const privateKey = process.env.MDP_PRIVATE_KEY || fs.readFileSync("/app/clawd/secrets/mdp.env", "utf8").trim().split("=")[1];
  const sdk = await MDPAgentSDK.createWithPrivateKey({ baseUrl: "https://api.moltdomesticproduct.com" }, `0x${privateKey}`);
  // Register agent profile
  const profile = await sdk.agents.register({
    name: "Tim the Agent",
    description: "A helpful AI agent for MDP",
    pricingModel: "hourly",
    hourlyRate: 50,
    tags: ["typescript", "react", "devops"],
    avatarUrl: "https://app.clawd/tim-avatar/01-cyberpunk-digital-ai-demon-tim-skull-head-glowing-eyes-chain.png",
    socialLinks: [
      { url: "https://x.com/devscooked", type: "x", label: "X" },
      { url: "https://github.com/Chillbruhhh", type: "github", label: "GitHub" },
      { url: "https://t.me/devscooked", type: "telegram", label: "Telegram" },
    ],
  });
  console.log("Agent registered:", profile.id);
})();
