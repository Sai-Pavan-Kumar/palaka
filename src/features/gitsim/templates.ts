export type GitTemplate = {
  id: string
  label: string
  script: string
  // Steps that fail on purpose (to show git refusing), by command text.
  expectedErrors?: string[]
}

const START = `git init
echo "home" > index.html
git add .
git commit -m "Home page"`

export const GIT_TEMPLATES: GitTemplate[] = [
  {
    id: 'first-commit',
    label: '1. First commit',
    script: `git init
echo "My project" > README.md
git status
git add README.md
git status
git commit -m "First commit"
git log --oneline`,
  },
  {
    id: 'three-areas',
    label: '2. Three areas',
    script: `${START}
echo "v2" >> index.html
touch notes.txt
git status
git add index.html
git status
git diff --staged
git commit -m "Update home"`,
  },
  {
    id: 'branches',
    label: '3. Branches',
    script: `${START}
git branch feature/login
git branch
git switch feature/login
echo "login" > login.html
git add .
git commit -m "Login page"
git switch main
ls
git switch feature/login
ls`,
  },
  {
    id: 'fast-forward',
    label: '4. Fast-forward merge',
    script: `${START}
git switch -c feature
echo "about" > about.html
git add .
git commit -m "About page"
git switch main
git merge feature
git branch -d feature`,
  },
  {
    id: 'three-way',
    label: '5. Merge commit',
    script: `${START}
git switch -c feature
echo "login" > login.html
git add .
git commit -m "Login page"
git switch main
echo "footer" > footer.html
git add .
git commit -m "Footer"
git merge feature
git log --oneline`,
  },
  {
    id: 'conflict',
    label: '6. Merge conflict',
    script: `${START}
git switch -c blue
echo "color: blue" > style.css
git add .
git commit -m "Blue theme"
git switch main
echo "color: green" > style.css
git add .
git commit -m "Green theme"
git merge blue
git status
echo "color: teal" > style.css
git add style.css
git commit -m "Merge blue, pick teal"`,
    expectedErrors: ['git merge blue'],
  },
  {
    id: 'rebase',
    label: '7. Rebase',
    script: `${START}
git switch -c feature
echo "login" > login.html
git add .
git commit -m "Login page"
echo "style" >> login.html
git commit -am "Style login"
git switch main
echo "footer" > footer.html
git add .
git commit -m "Footer"
git switch feature
git rebase main
git switch main
git merge feature`,
  },
  {
    id: 'cherry-pick',
    label: '8. Cherry-pick',
    script: `${START}
git switch -c experiments
echo "fix" > bugfix.js
git add .
git commit -m "Fix crash"
echo "wild" > wild.js
git add .
git commit -m "Wild idea"
git switch main
git cherry-pick experiments~1`,
  },
  {
    id: 'reset',
    label: '9. Reset soft / mixed / hard',
    script: `${START}
echo "a" > a.txt
git add .
git commit -m "Add a"
echo "b" > b.txt
git add .
git commit -m "Add b"
git reset --soft HEAD~1
git status
git reset HEAD~1
git status
git reset --hard HEAD
git reflog`,
  },
  {
    id: 'revert-amend',
    label: '10. Revert and amend',
    script: `${START}
echo "bug" > app.js
git add .
git commit -m "Add app wiht bug"
git commit --amend -m "Add app with bug"
git revert HEAD
git log --oneline`,
  },
  {
    id: 'stash',
    label: '11. Stash',
    script: `${START}
echo "half done" >> index.html
git status
git stash
git status
git switch -c hotfix
echo "fix" > fix.txt
git add .
git commit -m "Hotfix"
git switch main
git stash pop
git status`,
  },
  {
    id: 'push',
    label: '12. Push to GitHub',
    script: `${START}
git remote add origin https://github.com/you/site.git
git push -u origin main
echo "about" > about.html
git add .
git commit -m "About page"
git status
git push`,
  },
  {
    id: 'pull',
    label: '13. Clone, fetch, pull',
    script: `git clone https://github.com/team/app.git
teammate commit "Add install steps"
git fetch
git log --oneline --all
git pull
git log --oneline`,
  },
  {
    id: 'rejected',
    label: '14. Push rejected',
    script: `git clone https://github.com/team/app.git
echo "my change" > feature.txt
git add .
git commit -m "My feature"
teammate commit "Teammate fix"
git push
git pull
git push`,
    expectedErrors: ['git push'],
  },
  {
    id: 'squash',
    label: '15. Squash commits',
    script: `${START}
echo "1" > a.txt
git add .
git commit -m "wip"
echo "2" >> a.txt
git commit -am "wip again"
echo "3" >> a.txt
git commit -am "typo"
git reset --soft HEAD~3
git commit -m "Add a.txt"`,
  },
  {
    id: 'detached-head',
    label: '16. Detached HEAD',
    script: `${START}
git tag v1.0
echo "v2" >> index.html
git commit -am "Version 2"
git checkout v1.0
echo "try" >> index.html
git commit -am "Experiment"
git switch -c experiment`,
  },
]
