import { ThemeDetail } from '@/components/theme/theme-detail'

type Props = { params: Promise<{ id: string }> }

export default async function ThemePage({ params }: Props) {
  const { id } = await params
  return <ThemeDetail id={id} />
}
