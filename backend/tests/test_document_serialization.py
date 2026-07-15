from app.api.documents import _document_access_filter, _serialize_document


class FakeDocument:
    def model_dump(self):
        return {
            "id": "doc-1",
            "name": "Master Services Agreement",
            "assigned_to": {
                "id": "user-1",
                "email": "reviewer@example.com",
                "hashed_password": "must-not-leak",
                "role_id": "role-1",
            },
        }


def test_document_serialization_excludes_assignee_credentials():
    result = _serialize_document(FakeDocument())

    assert result["assigned_to"] == {
        "id": "user-1",
        "email": "reviewer@example.com",
    }


class FakeUser:
    def __init__(self, role_name):
        self.id = "user-1"
        self.role = type("Role", (), {"name": role_name})()


def test_reviewer_document_filter_scopes_uploaded_and_assigned_documents():
    result = _document_access_filter(FakeUser("Legal Reviewer"), ["doc-1", "doc-2"])

    assert result == {
        "AND": [
            {"id": {"in": ["doc-1", "doc-2"]}},
            {
                "OR": [
                    {"uploaded_by_id": "user-1"},
                    {"assigned_to_id": "user-1"},
                ]
            },
        ]
    }


def test_admin_document_filter_keeps_requested_ids_without_role_scope():
    assert _document_access_filter(FakeUser("Admin"), ["doc-1"]) == {
        "id": {"in": ["doc-1"]}
    }
