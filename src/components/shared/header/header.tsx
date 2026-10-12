import Logo from '../../logo';
import { Field } from '@/src/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/src/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import ThemeToggle from '../../theme-toggle';
import NavMenu from './nav-menu';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <Logo />
        <NavMenu />

        <div className="ml-auto md:order-last md:ml-0">
          <ThemeToggle />
        </div>

        <Field
          role="search"
          orientation="horizontal"
          className="flex h-9 w-full flex-row items-center gap-0 rounded-md border border-border bg-card md:ml-auto md:max-w-sm"
        >
          <Select defaultValue="BR">
            <SelectTrigger
              aria-label="Região"
              className="h-full w-auto shrink-0 rounded-r-none border-0 border-r border-border bg-transparent px-3 text-xs text-foreground shadow-none ring-0 focus:ring-0"
            >
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="border-border bg-popover text-popover-foreground"
            >
              <SelectGroup>
                <SelectItem value="BR">BR</SelectItem>
                <SelectItem value="20">NA</SelectItem>
                <SelectItem value="banana">KR</SelectItem>
                <SelectItem value="blueberry">EUW</SelectItem>
                <SelectItem value="grapes">SEA</SelectItem>
                <SelectItem value="pineapple">JP</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <InputGroup className="h-full rounded-none border-0 bg-transparent">
            <InputGroupInput
              className="h-full w-full border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              id="inline-start-input"
              placeholder="Invocador + #BR1"
              aria-label="Buscar invocador"
            />
            <InputGroupAddon
              align="inline-end"
              className="border-0 bg-transparent"
            >
              <SearchIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>
    </header>
  );
}
