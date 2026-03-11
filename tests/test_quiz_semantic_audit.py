import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.quiz_semantic_audit import audit_quiz_document


def make_document(item):
    return {
        "id": "fixture",
        "title": "Fixture",
        "sections": [
            {
                "title": "General Knowledge",
                "items": [
                    item,
                    {
                        "type": "multiple-choice",
                        "q": "Placeholder?",
                        "a": "Blue",
                        "options": ["Blue", "Red", "Green", "Yellow"],
                        "explanation": "Placeholder.",
                    },
                ],
            }
        ],
    }


class QuizSemanticAuditTests(unittest.TestCase):
    def test_flags_color_question_with_non_colors(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "What colour is Cookie Monster?",
                    "a": "Blue",
                    "options": ["Blue", "LEGO", "Mars", "Triangle"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_planet_question_with_non_planets(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "Which planet is known for rings?",
                    "a": "Saturn",
                    "options": ["Saturn", "Blue", "The Nile", "Hannibal Barca"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_number_question_with_non_numbers(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "How many legs does a spider have?",
                    "a": "Eight",
                    "options": ["Eight", "Mars", "Triangle", "Blue"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_person_question_with_non_people(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "Who wrote Matilda?",
                    "a": "Roald Dahl",
                    "options": ["Roald Dahl", "Mars", "Blue", "The Nile"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_cell_part_question_with_body_organs(self):
        issues = audit_quiz_document(
            {
                "id": "fixture",
                "title": "Fixture",
                "sections": [
                    {
                        "title": "Science",
                        "items": [
                            {
                                "type": "multiple-choice",
                                "q": "Which part of a plant cell contains chlorophyll?",
                                "a": "Chloroplast",
                                "options": ["Chloroplast", "Brain", "Heart", "Lungs"],
                                "explanation": "Placeholder.",
                            }
                        ],
                    }
                ],
            }
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_history_ruler_question_with_non_rulers(self):
        issues = audit_quiz_document(
            {
                "id": "fixture",
                "title": "Fixture",
                "sections": [
                    {
                        "title": "History",
                        "items": [
                            {
                                "type": "multiple-choice",
                                "q": "Which English queen was on the throne when the Spanish Armada was defeated?",
                                "a": "Elizabeth I",
                                "options": ["Elizabeth I", "The Iron Curtain", "Mercantilism", "The Heian period"],
                                "explanation": "Placeholder.",
                            }
                        ],
                    }
                ],
            }
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_amendment_question_with_generic_documents(self):
        issues = audit_quiz_document(
            {
                "id": "fixture",
                "title": "Fixture",
                "sections": [
                    {
                        "title": "History",
                        "items": [
                            {
                                "type": "multiple-choice",
                                "q": "Which amendment to the U.S. Constitution gave many American women the right to vote in 1920?",
                                "a": "Nineteenth Amendment",
                                "options": ["Nineteenth Amendment", "The US Constitution", "Treaty of Rome", "Treaty of Versailles"],
                                "explanation": "Placeholder.",
                            }
                        ],
                    }
                ],
            }
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_title_question_with_wrong_answer_pool(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "Which political tract opens with the words \"A spectre is haunting Europe\"?",
                    "a": "The Communist Manifesto",
                    "options": ["The Communist Manifesto", "Mars", "Blue", "Roald Dahl"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "option_type_mismatch" for issue in issues))

    def test_flags_same_quiz_answer_leakage(self):
        document = {
            "id": "fixture",
            "title": "Fixture",
            "sections": [
                {
                    "title": "Science",
                    "items": [
                        {
                            "type": "multiple-choice",
                            "q": "What colour is the sky on a clear day?",
                            "a": "Blue",
                            "options": ["Blue", "Mars", "Green", "Red"],
                            "explanation": "Placeholder.",
                        },
                        {
                            "type": "multiple-choice",
                            "q": "Which planet is known as the Red Planet?",
                            "a": "Mars",
                            "options": ["Mars", "Earth", "Jupiter", "Saturn"],
                            "explanation": "Placeholder.",
                        },
                    ],
                }
            ],
        }
        issues = audit_quiz_document(document)
        self.assertTrue(any(issue.code == "same_quiz_answer_leakage" for issue in issues))

    def test_flags_normalized_duplicate_options(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "Which ocean lies between North America and Europe?",
                    "a": "The Atlantic Ocean.",
                    "options": ["Atlantic Ocean", "Pacific Ocean", "The Atlantic Ocean.", "Indian Ocean"],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "normalized_duplicate_option" for issue in issues))
        self.assertTrue(any(issue.code == "answer_option_collision" for issue in issues))

    def test_flags_near_duplicate_acronym_expansion(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "What does GPS stand for?",
                    "a": "Global Positioning System",
                    "options": [
                        "Global Positioning System",
                        "Global Position System",
                        "Geographic Positioning Service",
                        "Global Positioning Satellite",
                    ],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "near_duplicate_option" for issue in issues))

    def test_flags_multi_answer_outlier(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "Who directed City of God?",
                    "a": "Fernando Meirelles and Katia Lund",
                    "options": [
                        "Fernando Meirelles and Katia Lund",
                        "Wes Anderson",
                        "Guillermo del Toro",
                        "Danny Boyle",
                    ],
                    "explanation": "Placeholder.",
                }
            )
        )
        self.assertTrue(any(issue.code == "multi_answer_outlier" for issue in issues))

    def test_flags_loaded_wording(self):
        issues = audit_quiz_document(
            make_document(
                {
                    "type": "multiple-choice",
                    "q": "What incredibly small island nation lies in the Mediterranean Sea?",
                    "a": "Malta",
                    "options": ["Malta", "Cyprus", "Iceland", "Bahrain"],
                    "explanation": "It is an incredibly important island state.",
                }
            )
        )
        self.assertTrue(any(issue.code == "loaded_wording" for issue in issues))


if __name__ == "__main__":
    unittest.main()
