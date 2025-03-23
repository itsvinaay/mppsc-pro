import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export const initializeTestData = async () => {
  try {
    const batch = writeBatch(db);

    // Categories Data
    const categories = {
      'forest-mains': {
        title: 'MPPSC FOREST MAINS',
        description: 'Free Mock Tests',
      },
      'mppsc-pre': {
        title: 'MPPSC PRE',
        description: 'Free Mock Tests',
      }
    };

    // Adding Categories
    Object.entries(categories).forEach(([categoryId, category]) => {
      batch.set(doc(db, 'categorie', categoryId), category);
    });

    // Tests Data
    const tests = {
      'forest-mains': [
        { id: 'polity-1', name: 'Important Polity Articles', attempts: 'ATTEMPT 0 OF 3', hasAnswers: true },
        { id: 'geography-1', name: 'Indian Geography 1', attempts: 'ATTEMPT 0 OF 3', hasAnswers: true }
      ],
      'mppsc-pre': [
        { id: 'polity-pre-1', name: 'Important Polity Articles', attempts: 'ATTEMPT 2 OF 3', hasAnswers: true }
      ]
    };

    // Adding Tests
    Object.entries(tests).forEach(([categoryId, testList]) => {
      testList.forEach(test => {
        batch.set(doc(db, `categories/${categoryId}/tests`, test.id), test);
      });
    });

    // Test Details Data
    const testDetails = {
      'polity-pre-1': {
        title: 'Important Polity Articles',
        questions: 10,
        bestScore: 0,
        time: '5 m',
        positiveMarks: 1,
        negativeMarks: 0,
      }
    };

    // Adding Test Details
    Object.entries(testDetails).forEach(([testId, detail]) => {
      batch.set(doc(db, `categories/mppsc-pre/tests`, testId), detail);
    });

    // Quiz Questions
    const questions = {
      'polity-pre-1': [
        {
          question: "Which article allows state for reservation?",
          options: ["Article 15(4)", "Article 16(4)", "Article 16(3)", "Article 16(5)"],
          correctAnswer: 1
        }
      ]
    };

    // Adding Questions
    Object.entries(questions).forEach(([testId, questionList]) => {
      questionList.forEach((question, index) => {
        batch.set(doc(db, `categories/mppsc-pre/tests/${testId}/questions`, `question-${index + 1}`), question);
      });
    });

    // Test Answers
    const answers = {
      'polity-pre-1': [
        {
          question: "Which article allows the state for reservation?",
          options: [
            { text: "Article 15(5)", isCorrect: false },
            { text: "Article 16(5)", isCorrect: false },
            { text: "Article 16(6)", isCorrect: true },
            { text: "Article 16(3)", isCorrect: false }
          ],
          explanation: "Inserted by 103rd amendment.",
          status: "unattempted"
        }
      ]
    };

    // Adding Answers
    Object.entries(answers).forEach(([testId, answerList]) => {
      answerList.forEach((answer, index) => {
        batch.set(doc(db, `categories/mppsc-pre/tests/${testId}/answers`, `answer-${index + 1}`), answer);
      });
    });

    await batch.commit();
    console.log('Firestore data initialized successfully');
  } catch (error) {
    console.error('Error initializing Firestore data:', error);
  }
};
