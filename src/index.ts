// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#using-the-type-checker
import * as ts from "typescript";
import * as fs from "fs";

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

/** Generate documentation for all classes in a set of .ts files */
export default function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): DocEntry[] {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let output: DocEntry[] = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit);
    }
  }

  return output;
  
  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {

    let symbol;
    if (('symbol' in node)) symbol = (node as any).symbol;
    else if ('name' in node) symbol = checker.getSymbolAtLocation((node as any).name);

    if (ts.isImportDeclaration(node)) {
      return;
    }

    if (ts.isMissingDeclaration(node)) {
      return
    }

    if (ts.isInterfaceDeclaration(node)) {
      return;
    }

    
    if (ts.isTypeAliasDeclaration(node)) {
      // This is a type alias, visit its type
      visit(node.type);
    } else

    if (ts.isVariableStatement(node)) {
      // this is a const statement or something
      for (let d of node.declarationList.declarations) {

        // We're only interested in variable declarations which are initialized to something
        // And later we will check that that thing is a function
        if (d.initializer) visit(d.initializer);
        
      }
    } else
    
    // This is a namespace, visit its children
    if (ts.isModuleDeclaration(node)) {
      ts.forEachChild(node, visit);
    } else
    
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      output.push(serializeFunction(symbol));
    } else

    if (ts.isFunctionDeclaration(node) && node.name) {
      // This is a top level function, get its symbol
      output.push(serializeFunction(symbol));
    } else

    if (ts.isClassDeclaration(node) && node.name) {
      // This is a top level class, get its symbol
      let symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        output.push(serializeClass(symbol));
      }
      // No need to walk any further, class expressions/inner declarations
      // cannot be exported
    }
    
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol: ts.Symbol): DocEntry {
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
      )
    };
  }

  /** Serialize a class symbol information */
  function serializeFunction(symbol: ts.Symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );
    details.constructors = constructorType
      .getCallSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol: ts.Symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );
    details.constructors = constructorType
      .getConstructSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature: ts.Signature) {
    return {
      parameters: signature.parameters.map(serializeSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
    };
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}