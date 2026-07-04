// src/lessons/all-lessons.js

import { A1_LESSONS } from "./A1/a1-lessons.js";
import { A2_LESSONS } from "./A2/a2-lessons.js";
import { B1_LESSONS } from "./B1/b1-lessons.js";
import { B2_LESSONS } from "./B2/b2-lessons.js";
import { C1_LESSONS } from "./C1/c1-lessons.js";

export const ALL_LESSONS = [
  ...A1_LESSONS,
  ...A2_LESSONS,
  ...B1_LESSONS,
  ...B2_LESSONS,
  ...C1_LESSONS
];