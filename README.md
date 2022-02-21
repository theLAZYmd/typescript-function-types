# typescript-function-types

A free and open source library for fetching the types of a function at runtime.

Please note that at writing (compile) time, you can easily get the type of a function using the native typescript function `Parameters<>`.
Example:
```ts
declare function f1(arg: { a: number; b: string }): void;
 
type T0 = Parameters<() => string>;
     
type T0 = []
type T1 = Parameters<(s: string) => void>;
     
type T1 = [s: string]
type T2 = Parameters<<T>(arg: T) => T>;
     
type T2 = [arg: unknown]
type T3 = Parameters<typeof f1>;
     
type T3 = [arg: {
    a: number;
    b: string;
}]
type T4 = Parameters<any>;
     
type T4 = unknown[]
type T5 = Parameters<never>;
     
type T5 = never
type T6 = Parameters<string>;
Type 'string' does not satisfy the constraint '(...args: any) => any'.
     
type T6 = never
type T7 = Parameters<Function>;
Type 'Function' does not satisfy the constraint '(...args: any) => any'.
  Type 'Function' provides no match for the signature '(...args: any): any'.
     
type T7 = never
```
https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype

You can use a similar utility type for the return type of a function

```ts
declare function f1(): { a: number; b: string };
 
type T0 = ReturnType<() => string>;
     
type T0 = string
type T1 = ReturnType<(s: string) => void>;
     
type T1 = void
type T2 = ReturnType<<T>() => T>;
     
type T2 = unknown
type T3 = ReturnType<<T extends U, U extends number[]>() => T>;
     
type T3 = number[]
type T4 = ReturnType<typeof f1>;
     
type T4 = {
    a: number;
    b: string;
}
type T5 = ReturnType<any>;
     
type T5 = any
type T6 = ReturnType<never>;
     
type T6 = never
type T7 = ReturnType<string>;
Type 'string' does not satisfy the constraint '(...args: any) => any'.
     
type T7 = any
type T8 = ReturnType<Function>;
Type 'Function' does not satisfy the constraint '(...args: any) => any'.
  Type 'Function' provides no match for the signature '(...args: any): any'.
     
type T8 = any
```

This library is for getting the types of function at runtime, meaning from a running node.js process.
The interface is simple:

```ts

namespace tyscript-function-types {

	/**
	 * Have the single input parameter be a pathway to the relevant file .ts from which to extract functions
	 * @example getTypes('./src/myModule.ts');
	 **/
	function getTypes(path: string): TypeData;

	/**
	 * Have the single input parameter be a function itself (yet uncalled). We will extract from the function's .ts source-file location.
	 * This requires you to compile your file with option `sourceMap: true`, or `--sourceMap`, if you're using tsc as a CLI.
	 * @example getTypes(myFunctionToGetParams);
	 **/
	function getTypes(myFunction: (...params: any[]) => any): TypeData;

	export default function getTypes(value: string | ((...params: any[]) => any)): TypeData;

}
```

With this in mind, this tool's intended use case is for meta-prgramming, for instance for getting data about a repo's typescript files.