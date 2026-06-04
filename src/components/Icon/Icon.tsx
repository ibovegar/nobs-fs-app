import { Lineicons, type LineiconsProps } from '@lineiconshq/react-lineicons'

export type IconProps = LineiconsProps

// App-wide icon renderer. Wrapping LineIcons keeps call sites importing from
// `~/components` instead of the vendor package, and leaves `color` at its
// `currentColor` default so icons inherit the surrounding theme color cascade.
export function Icon(props: IconProps) {
  return <Lineicons {...props} />
}
