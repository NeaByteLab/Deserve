# Contribution Guide

Contributions are welcome, and any help here is appreciated. There are a few ways to take part:

- **Create an Issue** - Propose a feature or report a bug.
- **Pull Request** - Fix a bug or a typo, or refactor the code.
- **Improve the docs** - Clear documentation helps everyone.
- **Share** - Tell people about Deserve, or write about how you use it.
- **Use it** - Try Deserve in a real project and share what you find.

> [!NOTE]
> Deserve started as the framework I wished already existed, a way to build on Deno that stays as small as the problem in front of it. That stance has not really changed, and I want to keep the code light, honest about its trade-offs, and true to the [philosophy](https://docs-deserve.neabyte.com/en/core-concepts/philosophy) of fewer moving parts. So if you bring a great idea but it does not fit that direction, it may not land.
>
> Don't worry though, Deserve is tested well and sharpened by the people who use it, and the goal is always the same, to keep it simple, build on the platform, and stay fast and pleasant to work with.

## AI Usage Policy

You may use AI to help you contribute, but it must never waste a maintainer's time or lower the quality of the work. You are responsible for everything you submit, so read it, test it, and make sure it is correct before opening a pull request.

## Prerequisites

Deserve runs on the Deno runtime and nothing from npm, so there is no `node_modules/` to install.

- [Deno](https://github.com/denoland/deno_install) 2.7.0 or later

## Local Development

Clone the repository and you are ready to work:

```bash
git clone git@github.com:NeaByteLab/Deserve.git
cd Deserve
```

Source lives in `src/`, tests in `tests/`, and the documentation in `docs/`.

## Checks

Before opening a pull request, make sure the project formats, lints, and type checks cleanly:

```bash
deno task check
```

Then run the tests:

```bash
deno task test
```

A pull request should pass both before it is ready for review.

## PRs

- Add or update tests when behavior changes
- Keep each pull request focused on a single change
- Match the existing code style, the formatter and linter are the source of truth
- Write a clear description that explains why the change is needed, not just what it does

## Reporting Security Issues

Please do not report security problems through public issues. See [SECURITY.md](SECURITY.md) for how to report them privately.

## License

By contributing to Deserve, you agree that your contributions will be licensed under the [MIT License](LICENSE).
