import { z } from "zod";
import { generateContract, staticModel } from "@krishthesmart/contract-kit";

const UserProfile = z.object({
  name: z.string(),
  role: z.string(),
  risk: z.enum(["low", "medium", "high"])
});

const result = await generateContract({
  model: staticModel([
    JSON.stringify({
      name: "Priya Shah",
      role: "Security Engineering Manager",
      risk: "medium"
    })
  ]),
  schema: UserProfile,
  prompt: "Extract the user's profile from the support ticket.",
  retries: 2,
  onEvent(event) {
    console.log(event.type);
  }
});

console.log(result.data);
