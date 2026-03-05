import React, { useCallback, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Types
export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioButtonProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  direction?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  containerStyle?: object;
  optionStyle?: object;
  labelStyle?: object;
  descriptionStyle?: object;
}

// Size config
const SIZE_CONFIG = {
  sm: { outer: 18, inner: 8,  fontSize: 13, descFontSize: 11, gap: 8  },
  md: { outer: 22, inner: 10, fontSize: 15, descFontSize: 13, gap: 10 },
  lg: { outer: 28, inner: 13, fontSize: 17, descFontSize: 14, gap: 12 },
};

// Single Radio Item
interface RadioItemProps {
  option: RadioOption;
  selected: boolean;
  onPress: (value: string) => void;
  size: 'sm' | 'md' | 'lg';
  color: string;
  optionStyle?: object;
  labelStyle?: object;
  descriptionStyle?: object;
}

const RadioItem = ({ option, selected, onPress, size, color, optionStyle, labelStyle, descriptionStyle }: RadioItemProps) => {
  const animScale  = React.useRef(new Animated.Value(selected ? 1 : 0)).current;
  const animBorder = React.useRef(new Animated.Value(selected ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: selected ? 1 : 0,
        useNativeDriver: true,
        tension: 180,
        friction: 10,
      }),
      Animated.timing(animBorder, {
        toValue: selected ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected]);

  const cfg = SIZE_CONFIG[size];

  const borderColor = animBorder.interpolate({
    inputRange: [0, 1],
    outputRange: ['#CBD5E1', color],
  });

  const handlePress = useCallback(() => {
    if (!option.disabled) onPress(option.value);
  }, [option, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={option.disabled ? 1 : 0.7}
      style={[styles.optionRow, optionStyle, option.disabled && styles.disabled]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: option.disabled }}
      accessibilityLabel={option.label}
    >
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: cfg.outer,
            height: cfg.outer,
            borderRadius: cfg.outer / 2,
            borderColor,
            borderWidth: selected ? 2 : 1.5,
          },
        ]}
      >
        <Animated.View
          style={{
            width: cfg.inner,
            height: cfg.inner,
            borderRadius: cfg.inner / 2,
            backgroundColor: color,
            transform: [{ scale: animScale }],
            opacity: animScale,
          }}
        />
      </Animated.View>

      <View style={{ marginLeft: cfg.gap, flex: 1 }}>
        <Text
          style={[
            styles.label,
            { fontSize: cfg.fontSize, color: option.disabled ? '#94A3B8' : '#1E293B' },
            labelStyle,
          ]}
        >
          {option.label}
        </Text>
        {option.description ? (
          <Text
            style={[
              styles.description,
              { fontSize: cfg.descFontSize, color: option.disabled ? '#CBD5E1' : '#64748B' },
              descriptionStyle,
            ]}
          >
            {option.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// Main RadioButton Group
const RadioButton = ({
  options,
  value,
  onChange,
  direction = 'vertical',
  size = 'md',
  color = '#6366F1',
  containerStyle,
  optionStyle,
  labelStyle,
  descriptionStyle,
}: RadioButtonProps) => {
  const [selected, setSelected] = useState(value);

  React.useEffect(() => { setSelected(value); }, [value]);

  const handleSelect = useCallback((val: string) => {
    setSelected(val);
    onChange && onChange(val);
  }, [onChange]);

  return (
    <View
      style={[
        styles.container,
        direction === 'horizontal' && styles.horizontal,
        containerStyle,
      ]}
    >
      {options.map((opt) => (
        <RadioItem
          key={opt.value}
          option={opt}
          selected={selected === opt.value}
          onPress={handleSelect}
          size={size}
          color={color}
          optionStyle={optionStyle}
          labelStyle={labelStyle}
          descriptionStyle={descriptionStyle}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
  },
  horizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  outerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  label: {
    fontWeight: '500',
    lineHeight: 20,
  },
  description: {
    marginTop: 2,
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default RadioButton;

/*
=== USAGE EXAMPLE ===

import RadioButton from './RadioButton';

const OPTIONS = [
  { label: 'Opsi Pertama', value: 'a', description: 'Deskripsi singkat opsi ini' },
  { label: 'Opsi Kedua',   value: 'b', description: 'Deskripsi singkat opsi ini' },
  { label: 'Opsi Ketiga',  value: 'c' },
  { label: 'Nonaktif',     value: 'd', disabled: true },
];

export default function App() {
  const [val, setVal] = useState('a');
  return (
    <View style={{ padding: 24 }}>
      <RadioButton
        options={OPTIONS}
        value={val}
        onChange={setVal}
        size="md"            // 'sm' | 'md' | 'lg'
        color="#6366F1"      // warna aksen bebas
        direction="vertical" // 'vertical' | 'horizontal'
      />
    </View>
  );
}
*/