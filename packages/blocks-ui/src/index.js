/** @jsx jsx */
import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Styled, ThemeProvider, jsx } from 'theme-ui'
import * as presets from '@theme-ui/presets'
import { Global } from '@emotion/core'

import * as themeComponents from '@theme-ui/components'

import * as transforms from './transforms'
import * as queries from './queries'

import pragma from './pragma'

import Header from './header'
import InlineRender from './inline-render'
import ElementContext from './element-context'
import SidePanel from './side-panel'

// blocks app theme
const appTheme = {
  ...presets.system,
  styles: {
    ...presets.system.styles,
    navlink: {
      color: 'inherit',
      textDecoration: 'none',
      fontWeight: 600
    }
  },
  buttons: {
    primary: {
      color: 'background',
      bg: 'primary',
      '&:hover': {
        bg: 'text'
      }
    },
    secondary: {
      color: 'text',
      bg: 'background',
      borderColor: 'text',
      border: 'thin solid'
    }
  }
}

const Blocks = {}
Blocks.Root = React.Fragment

const BLOCKS_Draggable = ({ active, children, ...props }) => {
  return (
    <Draggable {...props}>
      {(provided, snapshot) =>
        children(
          {
            ...provided,
            draggableProps: {
              ...provided.draggableProps,
              css: {
                boxShadow: active ? 'inset 0px 0px 0px 2px #bbbbbb' : undefined,
                ':hover': { boxShadow: 'inset 0px 0px 0px 2px #0079FF' }
              }
            }
          },
          snapshot
        )
      }
    </Draggable>
  )
}

export default ({ src: initialCode, blocks: providedBlocks, onChange }) => {
  const [code, setCode] = useState(null)
  const [transformedCode, setTransformedCode] = useState(null)
  const [elementId, setElementId] = useState(null)
  const [elementData, setElementData] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [themeName, setThemeName] = useState('tosh')

  const blocks = { ...providedBlocks }
  const theme = presets[themeName]

  const scope = {
    Blocks,
    Styled,
    Link: Styled.a,
    jsx: pragma(setElementId),
    BLOCKS_Droppable: Droppable,
    BLOCKS_Draggable: props => (
      <BLOCKS_Draggable active={props.draggableId === elementId} {...props} />
    ),
    BLOCKS_DraggableInner: props => <div {...props} />,
    BLOCKS_DroppableInner: props => <div {...props} />,
    BLOCKS_Text: props => <span {...props} />,
    ...themeComponents,
    ...providedBlocks
  }

  useEffect(() => {
    const newCode = transforms.addTuid(initialCode)
    setCode(newCode)
  }, [])

  useEffect(() => {
    if (!elementId) {
      return
    }

    const newElementData = queries.getCurrentElement(code, elementId)
    setElementData(newElementData)

    if (newElementData) {
      setActiveTab(0)
    }
  }, [elementId, code])

  useEffect(() => {
    try {
      const newTransformedCode = transforms.toTransformedJSX(code)
      const rawCode = transforms.toRawJSX(code)

      if (newTransformedCode) {
        setTransformedCode(newTransformedCode)
      }

      if (rawCode) {
        onChange(rawCode)
      }
    } catch (e) {}
  }, [code])

  if (!code || !transformedCode) {
    return null
  }

  const onDragEnd = drag => {
    if (!drag.destination) {
      return
    }

    if (
      drag.destination === 'root' &&
      drag.source.index === drag.destination.index
    ) {
      return
    }

    if (drag.source.droppableId === 'components') {
      const newCode = transforms.insertJSXBlock(code, { ...drag, blocks })
      setCode(newCode)
    } else if (drag.source.droppableId.startsWith('element-')) {
      console.log(drag)
    } else {
      const newCode = transforms.reorderJSXBlocks(code, drag)
      setCode(newCode)
    }
  }

  const onBeforeDragStart = drag => {
    setElementId(drag.draggableId)
  }

  const handleRemove = key => () => {
    const sx = elementData.props.sx || {}
    delete sx[key]

    setElementData({ ...elementData, props: { ...elementData.props, sx } })

    const { code: newCode } = transforms.removeSxProp(code, { elementId, key })
    setCode(newCode)
  }

  const handleRemoveElement = () => {
    const { code: newCode } = transforms.removeElement(code, { elementId })
    setCode(newCode)
    setElementId(null)
    setElementData(null)
  }

  const handleClone = () => {
    const { code: newCode } = transforms.cloneElement(code, { elementId })
    setCode(newCode)
  }

  const handleInsertElement = () => {
    const { code: newCode } = transforms.insertElementAfter(code, { elementId })
    setCode(newCode)
  }

  const handleTextUpdate = e => {
    const text = e.target.value
    setElementData({ ...elementData, text })

    const { code: newCode } = transforms.replaceText(code, { text, elementId })
    setCode(newCode)
  }

  const handleChange = key => e => {
    const sx = elementData.props.sx || {}
    sx[key] = e.target.value

    setElementData({ ...elementData, props: { ...elementData.props, sx } })

    const { code: newCode } = transforms.applySxProp(code, {
      elementId,
      key,
      value: e.target.value
    })

    setCode(newCode)
  }

  const handleParentSelect = () => {
    if (elementData.parentId) {
      setElementId(elementData.parentId)
    }
  }

  const handlePropChange = key => e => {
    setElementData({
      ...elementData,
      props: { ...elementData.props, [key]: e.target.value }
    })

    const { code: newCode } = transforms.applyProp(code, {
      elementId,
      key,
      value: e.target.value
    })

    setCode(newCode)
  }

  console.log(elementData)

  return (
    <ElementContext.Provider value={elementData}>
      <ThemeProvider theme={theme}>
        <Styled.root>
          <Global
            styles={{
              '*': {
                boxSizing: 'border-box'
              },
              body: {
                margin: 0
              }
            }}
          />
          <Header />
          <DragDropContext
            onDragEnd={onDragEnd}
            onBeforeDragStart={onBeforeDragStart}
          >
            <div
              sx={{
                display: 'flex'
              }}
            >
              <div
                sx={{
                  width: '60%',
                  backgroundColor: 'white',
                  height: '100vh',
                  overflow: 'scroll'
                }}
              >
                <InlineRender
                  scope={scope}
                  code={transformedCode}
                  theme={theme}
                />
              </div>
              <SidePanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                blocks={blocks}
                theme={appTheme}
                themeName={themeName}
                elementData={elementData}
                handleChange={handleChange}
                handlePropChange={handlePropChange}
                handleRemove={handleRemove}
                handleRemoveElement={handleRemoveElement}
                handleParentSelect={handleParentSelect}
                handleInsertElement={handleInsertElement}
                handleClone={handleClone}
                handleTextUpdate={handleTextUpdate}
                setThemeName={setThemeName}
                setElementId={setElementId}
              />
            </div>
          </DragDropContext>
        </Styled.root>
      </ThemeProvider>
    </ElementContext.Provider>
  )
}