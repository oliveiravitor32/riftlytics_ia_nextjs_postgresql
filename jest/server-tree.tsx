/**
 * Resolves a server component tree the way Next streams it, so React Testing
 * Library (a client renderer) can show it. `sections` are the async server
 * components to await (real code, nothing faked). Each <Suspense> becomes
 * either its resolved children or its fallback (what the user sees first).
 */

import React, { Suspense, isValidElement, type ReactNode } from 'react';

type Section = (props: never) => Promise<React.ReactElement>;

export async function resolveServerTree(
  node: ReactNode,
  sections: Section[],
  show: 'content' | 'fallback' = 'content'
): Promise<ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(
      node.map((child) => resolveServerTree(child, sections, show))
    );
  }
  if (!isValidElement<{ children?: ReactNode; fallback?: ReactNode }>(node)) {
    return node;
  }

  if (node.type === Suspense) {
    const shown =
      show === 'fallback' ? node.props.fallback : node.props.children;
    return <>{await resolveServerTree(shown, sections, show)}</>;
  }
  if (sections.includes(node.type as Section)) {
    const rendered = await (node.type as Section)(node.props as never);
    return resolveServerTree(rendered, sections, show);
  }
  if (node.props.children === undefined) return node;

  const children = await resolveServerTree(node.props.children, sections, show);
  // Spread back like JSX children, so static lists need no keys
  return Array.isArray(node.props.children)
    ? React.cloneElement(node, undefined, ...(children as ReactNode[]))
    : React.cloneElement(node, undefined, children);
}
