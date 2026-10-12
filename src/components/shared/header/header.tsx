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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <Logo />
        <Field className="flex w-full flex-row gap-0 rounded-full border border-border bg-card/80 p-1 shadow-sm">
          <Select defaultValue="BR">
            <SelectTrigger
              aria-label="Região"
              className="h-11 w-full max-w-28 rounded-full rounded-r-none border-0 bg-transparent px-4 text-sm text-foreground shadow-none ring-0 focus:ring-0"
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
          <InputGroup className="rounded-none border-0 bg-transparent">
            <InputGroupInput
              className="h-11 w-full border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              id="inline-start-input"
              placeholder="Invocador + #BR1"
              aria-label="Buscar invocador"
            />
            <InputGroupAddon
              align="inline-end"
              className="border-0 bg-transparent"
            >
              <SearchIcon className="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl justify-center px-4 pb-4">
        <NavMenu />
      </div>
    </header>
  );
}
