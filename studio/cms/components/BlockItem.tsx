import type {ObjectItemProps} from 'sanity'
import {styled} from 'styled-components'

/* One block of a repeatable page component: an FAQ question, a hero dial
   slide, a Recognition card. Set on the block's type (components.item), so
   the page's list of them shows each block as its own framed container: on
   top, Sanity's own row for it (drag to reorder, its menu to remove,
   duplicate or add another before or after; the list's Add item below),
   then, once opened, the block's own fields right beneath, inside the frame,
   instead of in a dialog over the page. A click on the row opens the block
   and a second click closes it again; one block is open at a time, as in
   Sanity's own lists. Page fields and a block's fields never look alike:
   the block's sit inset in a frame of their own, under its row. The same in
   the Visual editor's panel, where a click on a block in the preview opens
   it here. */
export function BlockItem(props: ObjectItemProps) {
  const {children, onClose, onOpen, open} = props
  return (
    <Block data-tomrow-block data-open={open ? '' : undefined}>
      {props.renderDefault({...props, open: false, onOpen: open ? onClose : onOpen})}
      {open && <Fields>{children}</Fields>}
    </Block>
  )
}

// A frame a shade lighter than the page, its edge a hairline, its corners the
// cards' (studio.css); brighter edged while open
const Block = styled.div`
  border: 1px solid var(--card-border-color);
  border-radius: var(--tomrow-card-radius);
  background: rgb(255 255 255 / 0.02);

  &[data-open] {
    border-color: rgb(255 255 255 / 0.16);
  }
`

// The block's own fields: inset, and ruled off from its row
const Fields = styled.div`
  padding: 16px 16px 20px;
  border-top: 1px solid var(--card-border-color);
`
