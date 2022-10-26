# DragAndDrop
This project contains code I wrote while following the [Understanding TypeScript - 2022 Edition](https://www.udemy.com/course/understanding-typescript/) course by Maximilian Schwarzmüller.

### Description
The __DragAndDrop__ project is written using `TypeScript`.

It contains two lists of projects: an _active_ list and a _finished_ list.
Items can be dragged and dropped between the lists.

To see the affect of code changes immediately in the browser we use `lite-server`, which is run via `npm start`.
`lite-server` is a simple _development only_ server which serves a web app (from the `index.html` file in the root directory) on the URL `localhost:3000` (this has the same effect as selecting the full path to the relevant `index.html` file and pasting it into the address bar of a browser). It refreshes whenever HTML or JavaScript changes are made. 

You can then interrogate the code via `Developer Tools`.

The project is marked as a `TypeScript` project using the command `tsc --init`. This command tells TypeScript that everything in the folder where it's run is managed by TypeScript. It does this by creating a `tsconfig.json` file and means that we can run `tsc` - without pointing at a specific file - to compile _all_ TypeScript files in the project. You can also use `tsc --watch` to run the compiler in _watch mode_.
