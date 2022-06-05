import t from 'prop-types';
import * as React from 'react';

/**
 * @description Some button props
 */
export type ButtonProps = {
  /**
   * @description Content of button
   */
  children: React.ReactNode;
  /**
   * @description Theme of button
   * @default primary
   */
  theme?: 'primary' | 'secondary';
  /**
   * @default m
   */
  size?: 's' | 'm' | 'l';
  /**
   * @description Fired on every click
   */
  onClick?: (event: React.MouseEvent) => void;
};

export const Button: React.FC<ButtonProps> = ({ children }) => <button onClick={console.log}>{children}</button>;
