import { LESSON_C1_COMMAND } from './lexiLessons.js';
import { C1_LESSONS } from './C1/c1-lessons.js';
import { createLevelFlow } from './levelFlowFactory.js';

const flow = createLevelFlow({
  levelId: 5,
  levelLabel: 'Уровень C1',
  listCommand: LESSON_C1_COMMAND,
  openCommand: 'lesson_c1_open',
  pageCommand: 'lesson_c1_page',
  stepCommand: 'lc1s',
  answerCommand: 'lc1a',
  completeCommand: 'lc1c',
  lessonsFallback: C1_LESSONS,
});

export const isLessonC1Command = flow.isLevelCommand;
export const isLessonC1OpenCommand = flow.isOpenCommand;
export const isLessonC1PageCommand = flow.isPageCommand;
export const isLessonC1StepCommand = flow.isStepCommand;
export const isLessonC1AnsCommand = flow.isAnswerCommand;
export const isLessonC1CompleteCommand = flow.isCompleteCommand;

export const handleLessonC1 = flow.handleLevel;
export const handleLessonC1Open = flow.handleOpen;
export const handleLessonC1Page = flow.handlePage;
export const handleLessonC1Step = flow.handleStep;
export const handleLessonC1Ans = flow.handleAnswer;
export const handleLessonC1Complete = flow.handleComplete;