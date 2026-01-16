# Contributing to VulnX-Ray

First off, thank you for considering contributing to VulnX-Ray! 🎉

## Code of Conduct

By participating in this project, you are expected to uphold our values of respect, collaboration, and constructive feedback.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Python version, Node version, Docker version)
- **Error messages** or logs

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Use case** - Why is this enhancement useful?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches you thought about
- **Implementation notes** - Technical details if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Branch naming**:
   - `feature/description` for new features
   - `bugfix/description` for bug fixes
   - `docs/description` for documentation
   - `refactor/description` for code refactoring

3. **Code changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

4. **Commit messages**:
   - Use conventional commits: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Examples:
     - `feat(search): add EPSS score filtering`
     - `fix(ingestion): handle GitHub API rate limiting`
     - `docs(readme): update deployment instructions`

5. **Submit pull request**:
   - Fill in the PR template
   - Link related issues
   - Request review from maintainers

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Linting
cd backend
black . --check
ruff check .

cd frontend
npm run lint
```

## Code Style

### Python (Backend)
- Follow PEP 8
- Use `black` for formatting
- Use `ruff` for linting
- Type hints for function signatures
- Docstrings for public functions/classes

### TypeScript (Frontend)
- Follow ESLint configuration
- Use Prettier for formatting
- Functional components with hooks
- TypeScript strict mode
- Descriptive variable names

### General Guidelines
- Keep functions small and focused
- Write self-documenting code
- Add comments for complex logic
- Avoid premature optimization
- Test edge cases

## Project Structure

```
vulnx-ray/
├── backend/           # FastAPI backend
│   ├── api/          # API routes
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   └── tests/        # Backend tests
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/      # Next.js App Router pages
│       ├── components/  # React components
│       └── utils/    # Utility functions
└── docs/            # Documentation
```

## Testing Guidelines

- Write tests for new features
- Maintain or improve code coverage
- Test both happy path and error cases
- Mock external dependencies
- Use descriptive test names

## Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Add inline code comments for complex logic
- Update CHANGELOG.md (we'll handle versioning)

## Questions?

Feel free to open an issue with the `question` label or reach out to maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making VulnX-Ray better!** 🛡️
