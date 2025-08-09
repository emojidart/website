"use client"

import * as React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000 // Keep toasts on screen for a very long time

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST
      toast: ToasterToast
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST
      toast: Partial<ToasterToast>
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST
      toastId?: ToasterToast["id"]
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }

    case actionTypes.DISMISS_TOAST:
      const { toastId } = action
      // ! Side effect ! - This will be executed in a separate render cycle
      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) => (t.id === toastId ? { ...t, open: false } : t)),
        }
      }
      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t, open: false })),
      }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

const listeners: ((state: State) => void)[] = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToasterToast, "id">

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  const addToast = React.useCallback((toast: Toast) => {
    const id = crypto.randomUUID()

    const update = (newToast: ToasterToast) =>
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...newToast, id },
      })

    const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: {
        ...toast,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss()
        },
      },
    })

    return {
      id: id,
      dismiss,
      update,
    }
  }, [])

  const showToast = React.useCallback(
    (variant: "default" | "destructive" | "success" | "warning" | "info", description: string, title?: string) => {
      addToast({
        title: title,
        description: description,
        variant: variant,
        duration: TOAST_REMOVE_DELAY,
      })
    },
    [addToast],
  )

  return {
    ...state,
    toast: addToast,
    showToast, // Expose the simplified showToast function
  }
}

export { useToast, reducer as toastReducer }
