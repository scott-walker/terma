// Bridge JSX namespace for @types/react v19+
// (JSX is no longer globally declared, it's exported from 'react')
declare namespace JSX {
  type Element = import('react').JSX.Element
  type IntrinsicElements = import('react').JSX.IntrinsicElements
  type ElementChildrenAttribute = import('react').JSX.ElementChildrenAttribute
  type IntrinsicAttributes = import('react').JSX.IntrinsicAttributes
  type IntrinsicClassAttributes<T> = import('react').JSX.IntrinsicClassAttributes<T>
}
