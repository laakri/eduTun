import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: {
    schema: "./prisma/schema.prisma",
    family: "sqlite",
    adapter: "sqlite",
    target: "node",
  },
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
