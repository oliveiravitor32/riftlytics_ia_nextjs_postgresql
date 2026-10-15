'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { Field } from '@/src/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/src/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { parseRiotIdInput, profileHref } from '@/src/lib/riot-id';

// Riot platform routing values (same codes our API routes expect)
const REGIONS = [
  { value: 'br1', label: 'BR' },
  { value: 'na1', label: 'NA' },
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'euw1', label: 'EUW' },
  { value: 'eun1', label: 'EUNE' },
  { value: 'kr', label: 'KR' },
  { value: 'jp1', label: 'JP' },
  { value: 'oc1', label: 'OCE' },
];

export default function SummonerSearch() {
  const router = useRouter();
  const [region, setRegion] = useState('br1');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const id = parseRiotIdInput(query);
    if (!id) {
      setError(true);
      return;
    }
    router.push(profileHref(region, id.gameName, id.tagLine));
    setQuery('');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="relative w-full md:ml-auto md:max-w-sm"
    >
      <Field
        orientation="horizontal"
        className="flex h-9 w-full flex-row items-center gap-0 rounded-md border border-border bg-card"
      >
        <Select value={region} onValueChange={setRegion}>
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
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup className="h-full rounded-none border-0 bg-transparent">
          <InputGroupInput
            className="h-full w-full border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            name="riotId"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(false);
            }}
            placeholder="Nome#TAG"
            aria-label="Buscar invocador (Nome#TAG)"
            aria-invalid={error}
            aria-describedby={error ? 'busca-erro' : undefined}
          />
          <InputGroupAddon
            align="inline-end"
            className="border-0 bg-transparent"
          >
            <button type="submit" aria-label="Buscar">
              <SearchIcon className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      {error && (
        <p
          id="busca-erro"
          role="alert"
          className="absolute left-0 top-full mt-1 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
        >
          Use o formato Nome#TAG (ex.: FlyerCloud#br1)
        </p>
      )}
    </form>
  );
}
