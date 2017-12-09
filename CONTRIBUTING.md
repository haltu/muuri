# Contributing to Muuri

First of all thanks for the interest in contributing to Muuri! Here you will find some instructions on how to create an issue or a pull request.

## Creating an issue

### Questions

First of all you should check out the existing [questions](https://github.com/haltu/muuri/issues?q=label%3Aquestion%20) and see if your question has been asked/answered already. If not, you can [create a new issue](https://github.com/haltu/muuri/issues/new) and explain the problem you're facing.

### Improvements

Improvement ideas are always welcome! Please check first the existing [ideas](https://github.com/haltu/muuri/issues?utf8=%E2%9C%93&q=label%3Aidea), [features](https://github.com/haltu/muuri/issues?q=label%3Afeature) and [enhancements](https://github.com/haltu/muuri/issues?q=label%3Aenhancement) so that you won't be creating a duplicate issue.

### Bugs

Please [create an issue](https://github.com/haltu/muuri/issues/new) and explain the bug in detail. If possible create a [reduced test case](https://css-tricks.com/reduced-test-cases/) and share a link to it. You can, for example, fork [this CodePen example](https://codepen.io/niklasramo/pen/jyJLGM) and modify it to demonstrate the bug.

## Creating a pull request

1. **Discuss first.**
   * The first step should always be [creating a new issue](https://github.com/haltu/muuri/issues/new) and discussing your pull request suggestion with the authors and the community.
   * After you get green light it's time to get coding.
2. **Fork the repo and create a new branch for your pull request.**
   * [Fork Muuri](https://github.com/haltu/muuri#fork-destination-box).
   * Create a new branch for your pull request from the master branch. The name of the pull request branch should start with the id of the issue you opened for the pull request, e.g. `#123-fix-something`.
3. **Setup the development environment.**
   * Install gulp-cli: `npm install gulp-cli -g`
   * Run `npm install` in the repository's directory.
   * You can now run the following gulp commands:
     * `gulp`
       * Lint, compress and test `muuri.js` file.
       * This is the command you should execute _successfully_ before opening the pull request.
     * `gulp lint`
       * Makes sure `muuri.js` file conforms to the project's ESLint config.
     * `gulp compress`
       * Creates a minified version of `muuri.js` file as `muuri.min.js`.
     * `gulp test`
       * Runs the unit tests in Sauce Labs.
       * To make this work you need to create an `.env` file the project root, which should contain `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` variables.
       * Launches chrome, firefox and safari by default.
       * You can provide arguments to launch specific browsers: `gulp test --chrome --firefox --safari --edge`
     * `gulp test-local`
       * Runs the unit tests locally.
       * Launches only chrome by default.
       * You can provide arguments to launch specific browsers: `gulp test-local --chrome --firefox --safari --edge`
4. **Do the updates.**
   * Now is the time to make the actual updates to Muuri.
   * Remember scope. Don't refactor things that are not related to the pull request. 
   * After you're done update unit tests and docs (`README.md`) if necessary.
   * Also, if this is your first pull request to Muuri remember to add yourself to the `AUTHORS.txt` file, e.g. `John Doe <https://github.com/johndoe>`.
5. **Create `muuri.min.js` and make sure nothing is broken.**
   * Run `gulp` _successfully_ and try to do some manual testing if possible.
6. **Create the pull request.**
   * Do your best to explain what the pull request fixes.
   * Mention which issue(s) will be closed by the pull request, e.g. `Closes #123`.
   * Request a review from [@niklasramo](https://github.com/niklasramo)
   * After your pull request is accepted it will be merged to the [dev branch](https://github.com/haltu/muuri/tree/dev) and released with the next release. If you did only some minor change in the documentation it may be merged directly to the master branch.
7. **You made it! Thank you so much for contributing to Muuri!**
