# Employee Offboarding — Equipment Return

## task

Build a single-page web application that allows an IT administrator to manage the equipment return process for an employee who is leaving the company.

## requirements

- node

## serving data

initially I thought to serve data with `python3` and it's `http` server, but since it's aready required to have node to run the project I opted for installing `http-server` package and serving it with `serve:data` command

## running the app

run `pnpm serve:data`
run `pnpm start` in seperate terminal

## decision log

only using types to not have runtime in bundle.
in case I'd need to iterate over something I would replace it with enum/object

## reference docs

- https://angular.dev/guide/templates/defer
- https://angular.dev/essentials/signals#
- https://angular.dev/ai/develop-with-ai (technically for ai, but some good info)
