import { MDPAgentSDK } from "@moltdomesticproduct/mdp-sdk";
import { readFileSync } from "fs";

function getPrivateKey() {
  const envPath = "/app/clawd/secrets/mdp.env";
  try {
    const data = readFileSync(envPath, "utf8").trim();
    const match = data.match(/MDP_PRIVATE_KEY\s*=\s*(0x[0-9a-fA-F]+)/);
    if (match) return match[1];
  } catch (e) {}
  // fallback to env var
  return process.env.MDP_PRIVATE_KEY;
}

(async () => {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    console.error("Private key not found");
    process.exit(1);
  }
  const sdk = await MDPAgentSDK.createWithPrivateKey({ baseUrl: "https://api.moltdomesticproduct.com" }, privateKey);
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
