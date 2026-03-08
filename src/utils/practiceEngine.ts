export type ArithmeticMode = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface PracticeQuestion {
  id: string;
  text: string;
  a: number;
  b: number;
  answer: number;
  mode: ArithmeticMode;
  visual: string[];
}

export interface PracticeResult {
  question: string;
  studentAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  mode: ArithmeticMode;
}

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const makeVisual = (count: number, emoji = '🍎') =>
  Array.from({ length: count }, () => emoji);

export function generateArithmeticQuestions(mode: ArithmeticMode, count = 5): PracticeQuestion[] {
  return Array.from({ length: count }, (_, index) => {
    let a = 1;
    let b = 1;
    let answer = 0;
    let text = '';
    let visual: string[] = [];

    switch (mode) {
      case 'addition':
        a = randomInt(1, 9);
        b = randomInt(1, 9);
        answer = a + b;
        text = `${a} + ${b} = ?`;
        visual = [...makeVisual(a), ...makeVisual(b, '➕')];
        break;

      case 'subtraction':
        a = randomInt(2, 12);
        b = randomInt(1, a - 1);
        answer = a - b;
        text = `${a} - ${b} = ?`;
        visual = makeVisual(a);
        break;

      case 'multiplication':
        a = randomInt(1, 5);
        b = randomInt(1, 5);
        answer = a * b;
        text = `${a} × ${b} = ?`;
        visual = Array.from({ length: a }, () => '🟦'.repeat(b));
        break;

      case 'division':
        b = randomInt(1, 5);
        answer = randomInt(1, 5);
        a = b * answer;
        text = `${a} ÷ ${b} = ?`;
        visual = makeVisual(a, '🍬');
        break;
    }

    return {
      id: `${mode}-${index + 1}`,
      text,
      a,
      b,
      answer,
      mode,
      visual,
    };
  });
}

export function getImprovementSummary(results: PracticeResult[]): string {
  const wrong = results.filter(r => !r.isCorrect);
  if (!wrong.length) return 'Excellent work. You answered all questions correctly.';

  const counts: Record<ArithmeticMode, number> = {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
  };

  wrong.forEach(item => counts[item.mode]++);

  const weakest = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] as ArithmeticMode;

  switch (weakest) {
    case 'addition':
      return 'You should practice addition a little more, especially combining small numbers quickly.';
    case 'subtraction':
      return 'You should practice subtraction more, especially taking away numbers carefully.';
    case 'multiplication':
      return 'You should revise multiplication tables and repeated groups.';
    case 'division':
      return 'You should practice division more by sharing numbers equally into groups.';
    default:
      return 'Keep practicing and you will improve more.';
  }
}
