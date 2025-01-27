/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

/** Interface describing a resolved import. */
export interface Import {
  /** Name of the imported symbol. */
  symbolName: string;
  /** Module name from which the symbol has been imported. */
  moduleName: string;
}


/** Resolves the import of the specified identifier. */
export function getImportOfIdentifier(node: ts.Identifier, typeChecker: ts.TypeChecker): Import|
    null {
  const directImport = getSpecificImportOfIdentifier(node, typeChecker);
  if (directImport !== null) {
    return directImport;
  } else if (ts.isQualifiedName(node.parent) && node.parent.right === node) {
    const qualifierRoot = getQualifiedNameRoot(node.parent);
    if (qualifierRoot) {
      const moduleName = getImportOfNamespacedIdentifier(qualifierRoot, typeChecker);
      if (moduleName) {
        return {moduleName, symbolName: node.text};
      }
    }
  } else if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
    const rootIdentifier = getPropertyAccessRoot(node.parent);
    if (rootIdentifier) {
      const moduleName = getImportOfNamespacedIdentifier(rootIdentifier, typeChecker);
      if (moduleName) {
        return {moduleName, symbolName: node.text};
      }
    }
  }
  return null;
}

/**
 * Resolves the import of the specified identifier. Expects the identifier to resolve
 * to a fine-grained import declaration with import specifiers.
 */
function getSpecificImportOfIdentifier(node: ts.Identifier, typeChecker: ts.TypeChecker): Import|
    null {
  const symbol = typeChecker.getSymbolAtLocation(node);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return null;
  }
  const declaration = symbol.declarations[0];
  if (!ts.isImportSpecifier(declaration)) {
    return null;
  }
  const importDecl = declaration.parent.parent.parent;
  if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
    return null;
  }
  return {
    moduleName: importDecl.moduleSpecifier.text,
    symbolName: declaration.propertyName ? declaration.propertyName.text : declaration.name.text
  };
}

/**
 * Resolves the import of the specified identifier. Expects the identifier to
 * resolve to a namespaced import declaration. e.g. "import * as core from ...".
 */
function getImportOfNamespacedIdentifier(node: ts.Identifier, typeChecker: ts.TypeChecker): string|
    null {
  const symbol = typeChecker.getSymbolAtLocation(node);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return null;
  }
  const declaration = symbol.declarations[0];
  if (!ts.isNamespaceImport(declaration)) {
    return null;
  }
  const importDecl = declaration.parent.parent;
  if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
    return null;
  }

  return importDecl.moduleSpecifier.text;
}


/**
 * Gets the root identifier of a qualified type chain. For example: "core.GestureConfig"
 * will return the "matCore" identifier. Allowing us to find the import of "core".
 */
function getQualifiedNameRoot(name: ts.QualifiedName): ts.Identifier|null {
  while (ts.isQualifiedName(name.left)) {
    name = name.left;
  }
  return ts.isIdentifier(name.left) ? name.left : null;
}

/**
 * Gets the root identifier of a property access chain. For example: "core.GestureConfig"
 * will return the "matCore" identifier. Allowing us to find the import of "core".
 */
function getPropertyAccessRoot(node: ts.PropertyAccessExpression): ts.Identifier|null {
  while (ts.isPropertyAccessExpression(node.expression)) {
    node = node.expression;
  }
  return ts.isIdentifier(node.expression) ? node.expression : null;
}
