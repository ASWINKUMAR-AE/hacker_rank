import { describe, it, expect } from 'vitest';
import { buildUserPrompt } from '../backend/src/ai/prompts';
import { ProblemPayload } from '../backend/src/types';
import { ChallengeAnalyzer } from '../backend/src/services/challengeAnalyzer';

describe('Image Extraction & 6-Step Workflow Automation', () => {
  const analyzer = new ChallengeAnalyzer();

  it('correctly includes extracted diagrams and schema images in AI user prompt', () => {
    const problemWithImages: ProblemPayload = {
      title: 'Top Competitors',
      category: 'SQL',
      selectedLanguage: 'MySQL',
      statement: 'Write a query to print the respective hacker_id and name of hackers who achieved full scores for more than one challenge.',
      images: [
        {
          src: 'https://s3.amazonaws.com/hr-challenge-images/0/1458526776-67eb3084a7-1.png',
          alt: 'Hackers and Submissions ER Diagram',
          title: 'Database Schema'
        },
        {
          src: 'https://s3.amazonaws.com/hr-challenge-images/0/1458526776-67eb3084a7-2.png',
          alt: 'Difficulty and Challenges Table Schema'
        }
      ],
      constraints: ['Sort by count of full scores in descending order.'],
      examples: [
        {
          input: 'Sample Input',
          output: '90411 Joe'
        }
      ]
    };

    const prompt = buildUserPrompt(problemWithImages);
    expect(prompt).toContain('PROBLEM DIAGRAMS / SCHEMA IMAGES (2 extracted');
    expect(prompt).toContain('https://s3.amazonaws.com/hr-challenge-images/0/1458526776-67eb3084a7-1.png');
    expect(prompt).toContain('Hackers and Submissions ER Diagram');
    expect(prompt).toContain('NOTE: For SQL/React challenges, the above images contain database schema ERDs');
  });

  it('correctly includes error feedback and previous attempt in retry prompt for self-healing', () => {
    const retryProblem: ProblemPayload = {
      title: 'Weather Observation Station 5',
      category: 'SQL',
      selectedLanguage: 'MySQL',
      statement: 'Query the two cities in STATION with the shortest and longest CITY names.',
      errorFeedback: 'Wrong Answer: Expected alphabetical tie breaking',
      previousAttempt: {
        code: 'SELECT CITY, LENGTH(CITY) FROM STATION ORDER BY LENGTH(CITY) ASC LIMIT 1;',
        error: 'Only one city returned instead of two',
        score: 0
      }
    };

    const prompt = buildUserPrompt(retryProblem);
    expect(prompt).toContain('PREVIOUS ATTEMPT FAILED / SCORED 0 POINTS');
    expect(prompt).toContain('SELECT CITY, LENGTH(CITY)');
    expect(prompt).toContain('Only one city returned instead of two');
    expect(prompt).toContain('Score Earned: 0 points');
    expect(prompt).toContain('CRITICAL INSTRUCTION: Analyze why the previous code scored 0 points');
  });

  it('identifies React challenges with visual mockups and state hooks', () => {
    const reactProblem: ProblemPayload = {
      title: 'Slideshow App',
      category: 'React',
      statement: 'Create a slideshow component with Restart, Prev, and Next buttons. See mockup in attached image.',
      images: [
        {
          src: 'https://hrcdn.net/react-slideshow-mockup.png',
          alt: 'Slideshow Component UI Mockup'
        }
      ],
      existingCode: 'function Slides({slides}) { return <div/>; }'
    };

    const category = analyzer.detectCategory(reactProblem);
    expect(category).toBe('React');
    const prompt = buildUserPrompt(reactProblem);
    expect(prompt).toContain('react-slideshow-mockup.png');
  });
});
