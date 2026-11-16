import 'package:flutter/material.dart';

import 'models.dart';
import 'shop.dart';
import 'theme.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({required this.product, required this.onOpen, super.key});

  final Product product;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    return InkWell(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 3 / 4,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClothImage(url: product.images.first),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white70,
                    ),
                    onPressed: () => shop.toggleSaved(product.id),
                    icon: Icon(
                      shop.saved(product.id)
                          ? Icons.favorite
                          : Icons.favorite_border,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(product.category.toUpperCase(), style: eyebrow()),
          const SizedBox(height: 2),
          Text(product.name, style: display(18)),
          Text(money(product.price), style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

class ClothImage extends StatelessWidget {
  const ClothImage({required this.url, super.key});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => const ColoredBox(
        color: AurelleColors.line,
        child: Center(child: Icon(Icons.image_outlined)),
      ),
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return const ColoredBox(color: AurelleColors.line);
      },
    );
  }
}

class GoldButton extends StatelessWidget {
  const GoldButton({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: AurelleColors.ink,
        foregroundColor: AurelleColors.ivory,
        minimumSize: const Size.fromHeight(48),
        shape: const RoundedRectangleBorder(),
      ),
      onPressed: onPressed,
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(letterSpacing: 1.4),
      ),
    );
  }
}
