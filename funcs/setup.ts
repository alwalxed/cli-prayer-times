import { program } from "commander";

export const setupCLI = async (): Promise<{ changeCity?: boolean }> => {
  program
    .version("1.0.0")
    .option("-c, --change-city", "Change the city")
    .parse(process.argv);

  return program.opts();
};
