import { LESSON_B1_COMMAND } from './lexiLessons.js';
import { B1_LESSONS } from './B1/b1-lessons.js';
import { createLevelFlow } from './levelFlowFactory.js';

const flow = createLevelFlow({
  levelId: 3,
  levelLabel: 'Уровень B1',
  listCommand: LESSON_B1_COMMAND,
  openCommand: 'lesson_b1_open',
  pageCommand: 'lesson_b1_page',
  stepCommand: 'lb1s',
  answerCommand: 'lb1a',
  completeCommand: 'lb1c',
  lessonsFallback: B1_LESSONS,
});

export const isLessonB1Command = flow.isLevelCommand;
export const isLessonB1OpenCommand = flow.isOpenCommand;
export const isLessonB1PageCommand = flow.isPageCommand;
export const isLessonB1StepCommand = flow.isStepCommand;
export const isLessonB1AnsCommand = flow.isAnswerCommand;
export const isLessonB1CompleteCommand = flow.isCompleteCommand;

export const handleLessonB1 = flow.handleLevel;
export const handleLessonB1Open = flow.handleOpen;
export const handleLessonB1Page = flow.handlePage;
export const handleLessonB1Step = flow.handleStep;
export const handleLessonB1Ans = flow.handleAnswer;
export const handleLessonB1Complete = flow.handleComplete;