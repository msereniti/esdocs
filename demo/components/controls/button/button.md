# Button component

This is button component

Example of usage:

```json button-config.json
{
  "text": "Very pure button"
}
```

```tsx test.tsx
import { Button as PureButton } from './button';
import buttonConfig from './button-config.json'

<div>
  <PureButton>{buttonConfig.text}</PureButton>
</div>
```

```css
button {
  background: red;
}
```