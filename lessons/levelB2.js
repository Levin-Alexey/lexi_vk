import { LESSON_B2_COMMAND } from './lexiLessons.js';
import { B2_LESSONS } from './B2/b2-lessons.js';
import { createLevelFlow } from './levelFlowFactory.js';

const flow = createLevelFlow({
  levelId: 4,
  levelLabel: 'Уровень B2',
  listCommand: LESSON_B2_COMMAND,
  openCommand: 'lesson_b2_open',
  pageCommand: 'lesson_b2_page',
  stepCommand: 'lb2s',
  answerCommand: 'lb2a',
  completeCommand: 'lb2c',
  lessonsFallback: B2_LESSONS,
});

export const isLessonB2Command = flow.isLevelCommand;
export const isLessonB2OpenCommand = flow.isOpenCommand;
export const isLessonB2PageCommand = flow.isPageCommand;
export const isLessonB2StepCommand = flow.isStepCommand;
export const isLessonB2AnsCommand = flow.isAnswerCommand;
export const isLessonB2CompleteCommand = flow.isCompleteCommand;

export const handleLessonB2 = flow.handleLevel;
export const handleLessonB2Open = flow.handleOpen;
export const handleLessonB2Page = flow.handlePage;
export const handleLessonB2Step = flow.handleStep;
export const handleLessonB2Ans = flow.handleAnswer;
export const handleLessonB2Complete = flow.handleComplete;