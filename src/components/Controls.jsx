export default function Controls({ countries, selectedCountry, onCountryChange }) {
  return (
    <div className="controls">
      <label htmlFor="country-select">Country:</label>
      <select
        id="country-select"
        value={selectedCountry}
        onChange={(e) => onCountryChange(e.target.value)}
      >
        <option value="global">Global</option>
        {countries.sort().map(c => (
          <option key={c} value={c}>{c.toUpperCase()}</option>
        ))}
      </select>
    </div>
  )
}
