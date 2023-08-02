import { getMaxPromptLength } from "../common/model/getMaxPromptLength";
import { commentOnPR as commentOnPRGithub } from "../common/ci/github/commentOnPR";
import { commentOnPR as commentOnPRGitlab } from "../common/ci/gitlab/commentOnPR";
import { commentPerFile } from "../common/ci/github/commentPerFile";
import { signOff } from "./constants";
import { askAI } from "./llm/askAI";
import { constructPromptsArray } from "./prompt/constructPrompt/constructPrompt";
import { File } from "../common/types";
import { filterFiles } from "./prompt/filterFiles";
import { ReviewArgs } from "../common/types";
import { GITHUB, GITLAB } from "../common/constants";
import { logger } from "../common/utils/logger";

export const review = async (yargs: ReviewArgs, files: File[]) => {
  logger.debug(`Review started.`);
  logger.debug(`Model used: ${yargs.model}`);
  logger.debug(`Ci enabled: ${yargs.ci}`);
  logger.debug(`Comment per file enabled: ${yargs.commentPerFile}`);

  const isCi = yargs.ci;
  const shouldCommentPerFile = yargs.commentPerFile;
  const modelName = yargs.model as string;

  const filteredFiles = filterFiles(files);
  const maxPromptLength = getMaxPromptLength(modelName);
  const prompts = await constructPromptsArray(filteredFiles, maxPromptLength);

  logger.debug(`Prompts used:\n ${prompts}`);

  const { markdownReport: response, feedbacks } = await askAI(
    prompts,
    modelName
  );

  logger.debug(`Markdown report:\n ${response}`);

  if (isCi === GITHUB) {
    if (!shouldCommentPerFile) {
      await commentOnPRGithub(response, signOff);
    }
    if (shouldCommentPerFile) {
      await commentPerFile(feedbacks, signOff);
    }
  }
  if (isCi === GITLAB) {
    await commentOnPRGitlab(response, signOff);
  }
};
