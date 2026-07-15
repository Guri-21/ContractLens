# Admin MSA and Legal Advisor Document Workflow

## Goal

Separate document ownership clearly:

- Admin uploads and assigns governing MSAs.
- Legal Advisor selects an assigned MSA and uploads one SOW.
- Legal Advisor may attach optional supporting agreements and evidence.
- MSA-versus-SOW contradiction detection remains active when supporting documents exist.

## Reviewer Experience

The Legal Advisor upload screen has three full-width sections.

### Governing MSA

- Shows a dropdown of MSAs available to the signed-in Legal Advisor.
- Each option shows the document name and status.
- This section has no file picker or replacement control.
- If no MSA is assigned, analysis is disabled and the screen explains that an Admin must assign one.

### Statement of Work

- Contains one required PDF/DOCX upload control.
- Shows the selected filename, size, replacement action, and removal action.
- The backend records the file explicitly as `SOW`; filename inference is not used.

### Supporting Documents

- Contains an optional multi-file upload control.
- Every file has an explicit document-type selector.
- Supported types are `NDA`, `SLA`, `EXHIBIT`, `AMENDMENT`, `ORDER_FORM`, `DPA`, and `OTHER`.
- Each row shows filename, type, size, and remove action.
- Duplicate filenames are rejected within the case.

The primary command is **Analyze Contract Package**. It is enabled only when an assigned MSA and SOW are selected and no upload is in progress.

## API Contract

### Upload

`POST /api/documents/upload` accepts multipart fields:

- `file`
- `document_type`

Legal Reviewers may upload `SOW`, `NDA`, `SLA`, `EXHIBIT`, `AMENDMENT`, `ORDER_FORM`, `DPA`, and `OTHER`. They may not upload `MSA`, `PLAYBOOK`, or `LAW`.

`POST /api/documents/admin-upload` always stores the uploaded document as `MSA`. The filename cannot override that type.

### Analysis

`POST /api/analyze` accepts:

```json
{
  "msaDocumentId": "admin-msa-id",
  "sowDocumentId": "reviewer-sow-id",
  "supportingDocumentIds": ["optional-document-id"],
  "playbookId": "selected-playbook-id",
  "countryCode": "IN"
}
```

The backend validates:

- The MSA exists, has type `MSA`, and is assigned to or otherwise accessible by the reviewer.
- The SOW exists, has type `SOW`, and was uploaded by or is accessible to the reviewer.
- Supporting documents use an allowed supporting type and are accessible to the reviewer.
- IDs are unique and cannot occupy multiple roles.

Invalid packages are rejected before the pipeline runs.

## Pipeline Behavior

The complete package is parsed and segmented. The selected MSA and SOW are always passed as the primary pair to contradiction detection. Supporting files participate in:

- clause extraction and classification;
- dependency and reference resolution;
- missing-document refusal checks;
- playbook validation;
- risk evidence and source citations;
- redline context where relevant.

Supporting files do not increase the primary contradiction pair beyond two documents. This prevents the existing `len(documents) == 2` behavior from silently disabling contradiction detection.

## Types

The shared frontend and backend document-type unions include:

`MSA | SOW | SLA | NDA | EXHIBIT | AMENDMENT | ORDER_FORM | DPA | OTHER | PLAYBOOK | LAW`

The database already stores document types as strings, so no column migration is required.

## Error Handling

- Missing assigned MSA: show a non-risk blocking state and do not run analysis.
- Invalid file type or size: reject before upload and name the affected file.
- Upload failure: retain successfully selected local files and allow retry.
- Deleted or inaccessible MSA: refresh the MSA list and require another selection.
- Invalid supporting type: reject the package before calling the pipeline.
- Referenced but absent exhibit: preserve `not_evaluated` with the missing document named.

## Verification

Backend tests cover explicit document typing, forbidden Legal Reviewer MSA upload, Admin MSA enforcement, package role/type validation, access validation, and primary-pair selection.

Frontend verification covers assigned-MSA selection, separate SOW/supporting zones, type selection, duplicate prevention, disabled states, request payload shape, and successful MSA/SOW analysis with optional supporting files.

The final workflow test is:

1. Admin uploads and assigns an MSA.
2. Legal Advisor sees but cannot replace that MSA.
3. Legal Advisor uploads one SOW and optional supporting documents.
4. Analysis detects MSA/SOW contradictions.
5. Supporting evidence appears in findings without disabling contradictions.
