import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAndValidateShareUpload } from '../functions/_utils/quiz-shares.ts';

const env = {
  QUIZ_SHARE_MAX_BYTES: '1000000'
};

function makeRequest(payload) {
  return new Request('https://blindsidedgames.com/api/quiz-shares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.blindsidedgames.quizpack'
    },
    body: JSON.stringify(payload)
  });
}

test('accepts legacy single-document quiz share uploads', async () => {
  const payload = {
    version: 3,
    exportedAt: '2026-03-20T12:00:00.000Z',
    quizzes: [
      {
        documentID: 'machines_custom_01',
        title: 'Machines',
        category: 'Custom',
        difficulty: 'Easy',
        source: 'importedCustom',
        document: {
          id: 'machines_custom_01',
          title: 'Machines',
          sections: [
            {
              title: 'Custom',
              items: []
            }
          ]
        }
      }
    ]
  };

  const result = await parseAndValidateShareUpload(makeRequest(payload), env);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.preview.quizCount, 1);
    assert.equal(result.preview.primaryTitle, 'Machines');
  }
});

test('accepts family-based quiz share uploads from the rebuilt app flow', async () => {
  const payload = {
    version: 3,
    exportedAt: '2026-03-20T12:00:00.000Z',
    quizzes: [
      {
        documentID: 'science_family_01',
        title: '',
        category: 'Science',
        source: 'generatedCustom',
        family: {
          id: 'science_family_01',
          title: 'Science Family',
          category: 'Science',
          variants: {
            easy: {
              id: 'science_easy_01',
              title: 'Science Family Easy',
              sections: [
                {
                  title: 'Science',
                  items: []
                }
              ]
            },
            medium: {
              id: 'science_medium_01',
              title: 'Science Family Medium',
              sections: [
                {
                  title: 'Science',
                  items: []
                }
              ]
            }
          }
        }
      }
    ]
  };

  const result = await parseAndValidateShareUpload(makeRequest(payload), env);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.preview.quizCount, 1);
    assert.equal(result.preview.primaryTitle, 'Science Family');
  }
});

test('rejects family-based uploads when no difficulty variant includes a quiz document', async () => {
  const payload = {
    version: 3,
    exportedAt: '2026-03-20T12:00:00.000Z',
    quizzes: [
      {
        documentID: 'science_family_01',
        title: 'Science Family',
        category: 'Science',
        source: 'generatedCustom',
        family: {
          id: 'science_family_01',
          title: 'Science Family',
          category: 'Science',
          variants: {}
        }
      }
    ]
  };

  const result = await parseAndValidateShareUpload(makeRequest(payload), env);

  assert.equal(result.ok, false);
  if (!result.ok) {
    const body = await result.response.json();
    assert.equal(body.error.code, 'invalid_package');
  }
});
