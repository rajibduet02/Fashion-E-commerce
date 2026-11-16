import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/models.dart';

void main() {
  test('shipping is complimentary from 150 and codes match the house', () {
    expect(shippingFor(150, 'standard'), 0);
    expect(shippingFor(80, 'standard'), 12);
    expect(shippingFor(80, 'express'), 28);
    expect(discountFor(200, 'AURELLE10'), 20);
    expect(discountFor(40, 'ATELIER25'), 25);
    expect(discountFor(40, 'NOPE'), 0);
  });
}
