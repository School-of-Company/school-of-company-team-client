# W4 state matrix

Implementation and browser acceptance checklist; no item is verified by this document alone.

| Actor                          | Project fields, members, parts, integrations | PM assignment | Part member assignment                  | Archive / restore     | Admin users / create project |
| ------------------------------ | -------------------------------------------- | ------------- | --------------------------------------- | --------------------- | ---------------------------- |
| Active LEAD                    | Allowed                                      | Allowed       | Any part                                | Allowed               | Allowed                      |
| Project PM                     | Allowed                                      | Hidden        | Any part                                | Allowed               | Hidden / denied              |
| Own-part leader                | Read only                                    | Hidden        | Own part only, existing project members | Hidden                | Hidden / denied              |
| Ordinary member                | Read only                                    | Hidden        | Hidden                                  | Hidden                | Hidden / denied              |
| Non-member, TEAM visibility    | Read only                                    | Hidden        | Hidden                                  | Hidden                | Hidden / denied              |
| Non-member, MEMBERS visibility | 404; reveal no project fields                | Hidden        | Hidden                                  | Hidden                | Hidden / denied              |
| Archived project               | Read only, including LEAD and PM             | Disabled      | Disabled                                | LEAD / PM can restore | Independent of project       |

PM exclusion is disabled until a LEAD replaces or clears the PM; former PM stays a participant.
Each participant may belong to several parts. Removing a part member who leads it clears that leadership.
Part removal preserves tasks and clears only their part assignment.
Last ACTIVE LEAD suspension / demotion is disabled; server LAST_HEAD_ADMIN remains authoritative.

| State                                                                   | Expected surface                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Initial loading                                                         | Loading feedback; no editable stale project or role data                              |
| Empty members / parts / repositories / installable repositories / users | Explicit empty message, permission-appropriate next action                            |
| Query failure                                                           | ErrorState with retry; suppress cached protected data on authorization failure        |
| Mutation pending                                                        | Related controls disabled; duplicate submission blocked                               |
| Mutation failure                                                        | Nearby accessible error message; values preserved; server error mapped to action      |
| PROJECT_NOT_FOUND                                                       | Unavailable project; existence hidden                                                 |
| PROJECT_FORBIDDEN                                                       | Readable resource, settings write denied; refresh authoritative state                 |
| PROJECT_ARCHIVED                                                        | Restore guidance; no further settings writes                                          |
| SUSPENDED / ONBOARDING_REQUIRED / ACCESS_DENIED                         | Shared API / identity guard plus explicit denial; never empty success                 |
| GitHub missing configuration / permission / repository in use           | Preserve settings; display reason and remediation                                     |
| Discord NOT_CONFIGURED                                                  | No channel yet; ID entry and server validation                                        |
| Discord DISABLED                                                        | Display disabledReason and requiredAction; manual permission cleanup and revalidation |

GitHub repository selection uses only installable-repositories results. Archived entries cannot be newly connected.
At most one default is selected through the server endpoint. Default applies only to new task choices.
Discord ID help: developer mode, right-click channel, copy ID. IDs remain strings.
MEMBERS links require explicit privacyConfirmed; channel / role permissions are never described as automatically synchronized.

Browser scenarios: LEAD / PM / own-part leader / member; 375px / 1280px;
loading / empty / retry / denied / pending; Tab / Enter / Space and visible focus.
Mock transport must be explicitly distinguished from real server, OAuth, GitHub App, and bot verification.
