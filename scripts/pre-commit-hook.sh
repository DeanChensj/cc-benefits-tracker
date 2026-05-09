#!/bin/bash

# CC Benefits Tracker - Strict Compilation & Linting Git Pre-Commit Guard Hook
# Prevents any broken, compile-warning, or un-formatted code from entering the history tree!

# Color outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 [CC Tracker Guard] Running pre-flight checks...${NC}"

# 1. Run ESLint formatting/convention check on staged TS/TSX files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=d | grep -E '\.(ts|tsx)$')

if [ -n "$STAGED_FILES" ]; then
  echo -e "${YELLOW}🧹 [CC Tracker Guard] Auto-formatting & linting staged files...${NC}"
  npx eslint --fix $STAGED_FILES
  LINT_RESULT=$?
  
  if [ $LINT_RESULT -ne 0 ]; then
    echo -e "\n${RED}❌ [CC Tracker Guard] ESLint validation FAILED!${NC}"
    echo -e "${RED}Unfixable coding convention violations detected. Commit blocked.${NC}\n"
    exit 1
  fi
  
  # Re-stage the auto-formatted files
  git add $STAGED_FILES
fi

# 2. Run TypeScript build check (tsc -b)
npx tsc -b
TSC_RESULT=$?

if [ $TSC_RESULT -ne 0 ]; then
  echo -e "\n${RED}❌ [CC Tracker Guard] TypeScript compiler type checks FAILED!${NC}"
  echo -e "${RED}Commit blocked. Please resolve the compilation errors listed above before committing.${NC}\n"
  exit 1
fi

# 3. Run full production build validation (npm run build)
npm run build > /dev/null 2>&1
BUILD_RESULT=$?

if [ $BUILD_RESULT -ne 0 ]; then
  echo -e "\n${RED}❌ [CC Tracker Guard] Production build validation FAILED!${NC}"
  echo -e "${RED}Verbatim Module Syntax or asset bundling errors detected. Commit blocked.${NC}\n"
  exit 1
fi

echo -e "${GREEN}✨ [CC Tracker Guard] All pre-flight checks PASSED! Proceeding to commit...${NC}"
exit 0
