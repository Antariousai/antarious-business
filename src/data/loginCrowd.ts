/**
 * Login crowd — people at work for Antarious TG.
 * Split into left/right wings so the collage stays balanced.
 */
export type TileSize = 'sm' | 'md' | 'lg'
export type TileAccent = 'sky' | 'mint' | 'coral' | 'sunshine'

export type CrowdTile = {
  key: string
  src: string
  size: TileSize
  accent: TileAccent
  tilt: number
}

/** Left wing size rhythm — right wing uses the same sequence (mirrored via CSS). */
const LEFT_SIZES: TileSize[] = [
  'lg', 'sm', 'sm', 'md', 'sm', 'md', 'sm', 'sm',
  'md', 'sm', 'lg', 'sm', 'sm', 'md', 'sm', 'md',
  'sm', 'sm', 'md', 'lg', 'sm', 'sm', 'md', 'sm',
  'md', 'sm', 'sm', 'md', 'sm', 'lg',
]

const ACCENTS: TileAccent[] = ['sky', 'mint', 'coral', 'sunshine']

/** People representing the work — bakers, baristas, stylists, shop owners… */
const PEOPLE = [
  'photo-1556910103-1c02745aae4d',
  'photo-1577219491135-ce391730fb2c',
  'photo-1556740738-b6a63e27c4df',
  'photo-1560066984-138dadb4c035',
  'photo-1522337360788-8b13dee7a37e',
  'photo-1522338140262-f46f5913618a',
  'photo-1562322140-8baeececf3df',
  'photo-1571019614242-c5c5dee9f50b',
  'photo-1518611012118-696072aa579a',
  'photo-1581578731548-c64695cc6952',
  'photo-1581091226825-a6a2a5aee158',
  'photo-1522071820081-009f0129c71c',
  'photo-1600880292203-757bb62b4baf',
  'photo-1552664730-d307ca884978',
  'photo-1519741497674-611481863552',
  'photo-1507679799987-c73779587ccf',
  'photo-1517248135467-4c7edcad34c4',
  'photo-1555396273-367ea4eb4db5',
  'photo-1572116469696-31de0f17cc34',
  'photo-1514933651103-005eec06c04b',
  'photo-1441986300917-64674bd600d8',
  'photo-1483985988355-763728e1935b',
  'photo-1554118811-1e0d58224f24',
  'photo-1509042239860-f550ce710b93',
  'photo-1495474472287-4d71bcdd2085',
  'photo-1559339352-11d035aa65de',
  'photo-1579871494447-9811cf80d66c',
  'photo-1504754524776-8f4f37790ca0',
  'photo-1414235077428-338989a2e8c0',
  'photo-1540555700478-4be289fbecef',
  'photo-1522335789203-aabd1fc54bc9',
  'photo-1516975080664-ed2fc6a32937',
  'photo-1490750967868-88aa4486c946',
  'photo-1516035069371-29a1b244cc32',
  'photo-1556742049-0cfed4f6a45d',
  'photo-1556742111-a301076d9d18',
  'photo-1472851294608-062f824d29cc',
  'photo-1556742044-3c52d6e88c62',
  'photo-1586528116311-ad8dd3c8310d',
  'photo-1542744173-8e7e53415bb0',
  'photo-1557804506-669a67965ba0',
  'photo-1556761175-b413da4baf72',
  'photo-1522202176988-66273c2fd55f',
  'photo-1573164713714-d95e436ab8d6',
  'photo-1460925895917-afdab827c52f',
  'photo-1519389950473-47ba0277781c',
  'photo-1511285560929-80b456fea0bc',
  'photo-1464366400600-7168b8af9bc3',
  'photo-1492684223066-81342ee5ff30',
  'photo-1470225620780-dba8ba36b745',
  'photo-1470337458703-46ad1756a187',
  'photo-1535958636474-b021ee887b13',
  'photo-1488459716781-31db52582fe9',
  'photo-1556741533-6e6a62bd8b49',
  'photo-1441984904996-e0b6ba687e04',
  'photo-1517433670267-08bbd4be890f',
  'photo-1555507036-ab1f4038808a',
  'photo-1509440159596-0249088772ff',
  'photo-1478720568477-152d9b164e26',
  'photo-1589829545856-d10d557cf95f',
] as const

const TILTS = [-2.4, -1.2, 0.6, 1.8, -0.8, 2.2, -1.6, 1.1]

function srcFor(photoId: string) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=480&h=480&q=80`
}

function makeTile(photo: string, i: number, size: TileSize): CrowdTile {
  return {
    key: `${photo}-${i}`,
    src: srcFor(photo),
    size,
    accent: ACCENTS[i % ACCENTS.length],
    tilt: TILTS[i % TILTS.length],
  }
}

export function buildCrowdWings(): { left: CrowdTile[]; right: CrowdTile[] } {
  const left = PEOPLE.slice(0, 30).map((photo, i) => makeTile(photo, i, LEFT_SIZES[i]))
  const right = PEOPLE.slice(30, 60).map((photo, i) => makeTile(photo, i + 30, LEFT_SIZES[i]))
  return { left, right }
}
