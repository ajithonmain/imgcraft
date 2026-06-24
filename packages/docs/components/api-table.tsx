interface ApiTableRow {
  name: string
  type: string
  default?: string
  description: string
}

interface ApiTableProps {
  rows: ApiTableRow[]
}

export function ApiTable({ rows }: ApiTableProps) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
      <table className="api-table">
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="prop-name">{row.name}</td>
              <td className="prop-type">{row.type}</td>
              <td className="prop-default">{row.default ?? '—'}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
