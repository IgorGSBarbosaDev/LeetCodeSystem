import type { Problem } from '../types'

const twoSum: Problem = {
  id: 'two-sum-001',
  title: 'Two Sum',
  difficulty: 'EASY',
  categories: ['Array', 'Hash Table'],
  description:
    'Dado um array de inteiros nums e um inteiro target, retorne os índices dos dois números cuja soma seja igual ao target.',
  constraints: ['2 ≤ nums.length ≤ 10⁴', 'Existe exatamente uma solução válida.'],
  examples: [{ input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' }],
  method: {
    name: 'twoSum',
    returnType: 'int[]',
    parameters: [
      { name: 'nums', type: 'int[]' },
      { name: 'target', type: 'int' },
    ],
  },
  starterCode: {
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Escreva sua solução aqui
        return new int[0];
    }
    }`,
  },
  solution: {
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) return new int[] { seen.get(complement), i };
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    explanation: 'Use um mapa para localizar o complemento de cada número em tempo constante.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
  },
  testCases: [
    { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], hidden: false },
    { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], hidden: false },
    { input: { nums: [3, 3], target: 6 }, expectedOutput: [0, 1], hidden: true },
  ],
  progress: { status: 'SOLVED', attempts: 3, favorite: true, reviewRequired: false },
}

const makeProblem = (
  problem: Omit<Problem, 'progress'>,
  progress: Problem['progress'],
): Problem => ({ ...problem, progress })

export const demoProblems: Problem[] = [
  twoSum,
  makeProblem(
    {
      ...twoSum,
      id: 'valid-parentheses-001',
      title: 'Valid Parentheses',
      difficulty: 'EASY',
      categories: ['String', 'Stack'],
      description: 'Dada uma string contendo apenas os caracteres de parênteses, determine se a sequência é válida.',
      examples: [{ input: 's = "()[]{}"', output: 'true' }],
      starterCode: { java: 'class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}' },
    },
    { status: 'SOLVED', attempts: 2, favorite: false, reviewRequired: false },
  ),
  makeProblem(
    { ...twoSum, id: 'merge-two-sorted-lists-001', title: 'Merge Two Sorted Lists', categories: ['Linked List', 'Recursion'] },
    { status: 'SOLVED', attempts: 1, favorite: false, reviewRequired: false },
  ),
  makeProblem(
    { ...twoSum, id: 'longest-substring-001', title: 'Longest Substring Without Repeating Characters', difficulty: 'MEDIUM', categories: ['Hash Table', 'Sliding Window'] },
    { status: 'SOLVED', attempts: 4, favorite: true, reviewRequired: false },
  ),
  makeProblem(
    { ...twoSum, id: 'container-most-water-001', title: 'Container With Most Water', difficulty: 'MEDIUM', categories: ['Array', 'Two Pointers'] },
    { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
  ),
  makeProblem(
    { ...twoSum, id: 'binary-tree-level-order-001', title: 'Binary Tree Level Order Traversal', difficulty: 'MEDIUM', categories: ['Tree', 'BFS'] },
    { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
  ),
  makeProblem(
    { ...twoSum, id: 'trapping-rain-water-001', title: 'Trapping Rain Water', difficulty: 'HARD', categories: ['Array', 'Dynamic Programming'] },
    { status: 'ATTEMPTED', attempts: 1, favorite: true, reviewRequired: true },
  ),
]
