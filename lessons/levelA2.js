import { LESSON_A2_COMMAND } from './lexiLessons.js';
import { A2_LESSONS } from './A2/a2-lessons.js';
import { createLevelFlow } from './levelFlowFactory.js';

const flow = createLevelFlow({
  levelId: 2,
  levelLabel: 'Уровень A2',
  listCommand: LESSON_A2_COMMAND,
  openCommand: 'lesson_a2_open',
  pageCommand: 'lesson_a2_page',
  stepCommand: 'la2s',
  answerCommand: 'la2a',
  completeCommand: 'la2c',
  lessonsFallback: A2_LESSONS,
});

export const isLessonA2Command = flow.isLevelCommand;
export const isLessonA2OpenCommand = flow.isOpenCommand;
export const isLessonA2PageCommand = flow.isPageCommand;
export const isLessonA2StepCommand = flow.isStepCommand;
export const isLessonA2AnsCommand = flow.isAnswerCommand;
export const isLessonA2CompleteCommand = flow.isCompleteCommand;

export const handleLessonA2 = flow.handleLevel;
export const handleLessonA2Open = flow.handleOpen;
export const handleLessonA2Page = flow.handlePage;
export const handleLessonA2Step = flow.handleStep;
export const handleLessonA2Ans = flow.handleAnswer;
export const handleLessonA2Complete = flow.handleComplete;