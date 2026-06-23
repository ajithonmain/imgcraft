interface Props {
  params: Promise<{ slug?: string[] }>
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params
  const path = slug?.join('/') ?? 'index'
  return (
    <main>
      <p>Docs page: {path}</p>
    </main>
  )
}
