Branches Module

Routes

- /branches — BranchesPage: list, create, edit, delete branches.

Key Components

- BranchFormModal: create/update branch details; boolean is_active handling.

APIs

- Uses `@shared/api`: getBranches, createBranch, updateBranch, deleteBranch.

State & Caching

- Query: ['branches']
- Mutations invalidate: ['branches']

