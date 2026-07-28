'use client'

/**
 * Compatibility shim so existing SPA imports keep working on Next.js App Router.
 * Maps react-router-dom APIs → next/link + next/navigation.
 */
import NextLink from 'next/link'
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
  type ReadonlyURLSearchParams,
} from 'next/navigation'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react'

type To = string

type ClassNameFn = (args: { isActive: boolean; isPending: boolean }) => string | undefined
type ChildrenFn = (args: { isActive: boolean; isPending: boolean }) => ReactNode

export function useNavigate() {
  const router = useRouter()
  return useCallback(
    (to: To | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'number') {
        if (to < 0) router.back()
        else if (to > 0) router.forward()
        return
      }
      if (options?.state != null && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            `nav-state:${to}`,
            JSON.stringify(options.state),
          )
        } catch {
          // ignore quota
        }
      }
      if (options?.replace) router.replace(to)
      else router.push(to)
    },
    [router],
  )
}

export function useLocation() {
  const pathname = usePathname() || '/'
  const searchParams = useNextSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  return useMemo(
    () => ({
      pathname,
      search,
      hash: '',
      state: null,
      key: pathname + search,
    }),
    [pathname, search],
  )
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>() {
  return useNextParams() as T
}

/** react-router-compatible: [URLSearchParams, setSearchParams] */
export function useSearchParams(): [
  ReadonlyURLSearchParams | URLSearchParams,
  (next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => void,
] {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const params = useNextSearchParams()

  const setSearchParams = useCallback(
    (next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => {
      const sp =
        next instanceof URLSearchParams
          ? next
          : new URLSearchParams(Object.entries(next).filter(([, v]) => v != null && v !== ''))
      const q = sp.toString()
      const href = q ? `${pathname}?${q}` : pathname
      if (opts?.replace) router.replace(href)
      else router.push(href)
    },
    [pathname, router],
  )

  return [params ?? new URLSearchParams(), setSearchParams]
}

type LinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  to: To
  replace?: boolean
  prefetch?: boolean
  state?: unknown
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, prefetch, state, children, onClick, ...rest },
  ref,
) {
  return (
    <NextLink
      ref={ref}
      href={to}
      replace={replace}
      prefetch={prefetch}
      onClick={(e) => {
        if (state != null && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`nav-state:${to}`, JSON.stringify(state))
          } catch {
            // ignore
          }
        }
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </NextLink>
  )
})

type NavLinkProps = Omit<LinkProps, 'className' | 'children'> & {
  end?: boolean
  className?: string | ClassNameFn
  children?: ReactNode | ChildrenFn
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, children, onClick, ...rest },
  ref,
) {
  const pathname = usePathname() || '/'
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
  const args = { isActive, isPending: false }
  const resolvedClass = typeof className === 'function' ? className(args) : className
  const resolvedChildren = typeof children === 'function' ? children(args) : children

  return (
    <NextLink ref={ref} href={to} className={resolvedClass} onClick={onClick} {...rest}>
      {resolvedChildren}
    </NextLink>
  )
})

/** Layout outlet — Next.js layouts pass children; this context bridges AppLayout. */
const OutletContext = createContext<ReactNode>(null)

export function OutletProvider({ children, outlet }: { children: ReactNode; outlet: ReactNode }) {
  return <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>
}

export function Outlet() {
  return <>{useContext(OutletContext)}</>
}

export function Navigate({ to, replace }: { to: To; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [router, to, replace])
  return null
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Route(_props: { path?: string; element?: ReactNode; index?: boolean; children?: ReactNode }) {
  return null
}
