# Employee Offboarding — Equipment Return

## task

Build a single-page web application that allows an IT administrator to manage the equipment return process for an employee who is leaving the company.

## requirements

- node

## package manager

this app uses `pnpm` as a package manager, but it is possible to use npm or any other package manager to run this app - it has no dependencies on any package manager internals. I used `pnpm` as it's faster than `npm` and as supply chain attack goes for the past few months - it's also safer. `pnpm` also don't have 1M rust ai generated code as a 1 off pr, so it feels more stable.

## serving data

initially I thought to serve data with `python3` and it's `http` server, but since it's aready required to have node to run the project I opted for installing `http-server` package and serving it with `serve:data` command

## running the app

run `pnpm serve:data`
run `pnpm start` in seperate terminal

## decision log

- only using types to not have runtime in bundle.
  in case I'd need to iterate over something I would replace it with enum/object, i.e. ReturnCondition - needed values for dropdown option, cna use enum for both type safety and convenience
- mostly using ai to generate css (i know it was probably not desired, as it was defined to not use ui lib in spec, but i just can't help myself to get something generate css for me)
- split down components to be self contained (trying to be reasonable about it, i.e. seperate issue-form and return-form as a children of equipment item. they introduce some clutter and it's easy to only react to emited value (output))

## on ai

- as I didn't use newer angular for some time I did use AI to help me understand / read about some of new syntax, alongside reading [docs](#reference-docs)
- as mentioned beforehand - used ai to generate css, for shortcomings I did need to point out that some styles are repeated to bubble them up to src/styles.css

## to improve

- persist state for equipment return process (it's bad ux to close dialog and needing to return everything from the start)
- clean up css, lots of dead code probably, some rules have no sense, would be good to have a proper design system and not mix modern and old material ui style
- introduce `internationalization` for admins from different countries
- invalidate cache on employee service
- use a design system for better ux

## reference docs

- https://angular.dev/guide/templates/defer
- https://angular.dev/essentials/signals#
- https://angular.dev/ai/develop-with-ai (technically for ai, but some good info)
